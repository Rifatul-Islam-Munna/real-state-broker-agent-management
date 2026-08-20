import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  parseLeadCollectionTemplate,
  prepareLeadCollectionSource,
} from '../mail/lead-collection-parser';
import { normalizeLinkedPageConfig } from '../mail/linked-page-config';
import { enrichEmailWithLinkedPage, loadConfiguredLinkedPage } from '../mail/linked-page-loader';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantRealtorWorkflowService } from './tenant-realtor-workflow.service';

@Injectable()
export class TenantLegacyCompatibilityService {
  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly dashboard: TenantDashboardService,
    private readonly workflows: TenantRealtorWorkflowService,
  ) {}

  async listProperties(tenant: SaasTenant, query: any) {
    const rows = await this.dashboard.listProperties(tenant);
    const items = rows.map((row: any) => this.propertyItem(row));
    return this.paginate(this.filter(items, query), query);
  }

  async createProperty(tenant: SaasTenant, body: any, actorUserId: number) {
    const row = await this.dashboard.createProperty(
      tenant,
      { title: body?.title, status: this.storagePropertyStatus(body?.status), payload: body ?? {} },
      actorUserId,
    );
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
      const documentRepositoryItemIds = await this.syncPropertyDocuments(
        client,
        Number(row.id),
        `${row.title ?? body?.title ?? ''}`.trim(),
        payload.propertyDocuments,
      );
      const nextPayload = { ...payload, documentRepositoryItemIds };
      const updated = await client.query(
        `UPDATE tenant_property
         SET payload = $2::jsonb, updated_at = now()
         WHERE id = $1
         RETURNING id, title, status, payload, created_at, updated_at`,
        [Number(row.id), JSON.stringify(nextPayload)],
      );
      if ((updated.rows[0] ?? row)?.status === 'published') {
        await this.linkMatchingUnlistedLeads(
          client,
          Number(row.id),
          `${row.title ?? body?.title ?? ''}`.trim(),
        );
      }
      return this.propertyItem(updated.rows[0] ?? { ...row, payload: nextPayload });
    });
  }

  async updateProperty(tenant: SaasTenant, body: any) {
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query('SELECT payload FROM tenant_property WHERE id = $1', [id]);
      if (!current.rowCount) throw new NotFoundException('Property not found');
      const payload = { ...(current.rows[0].payload ?? {}), ...(body ?? {}) };
      payload.documentRepositoryItemIds = await this.syncPropertyDocuments(
        client,
        id,
        `${body?.title ?? payload.title ?? ''}`.trim(),
        payload.propertyDocuments,
      );
      const result = await client.query(
        `UPDATE tenant_property SET title = $2, status = $3, payload = $4::jsonb, updated_at = now()
         WHERE id = $1 RETURNING id, title, status, payload, created_at, updated_at`,
        [id, `${body?.title ?? payload.title ?? ''}`.trim(), this.storagePropertyStatus(body?.status), JSON.stringify(payload)],
      );
      if (result.rows[0]?.status === 'published') {
        await this.linkMatchingUnlistedLeads(
          client,
          id,
          `${result.rows[0]?.title ?? body?.title ?? payload.title ?? ''}`.trim(),
        );
      }
      return this.propertyItem(result.rows[0]);
    });
  }

  private async linkMatchingUnlistedLeads(
    client: PoolClient,
    propertyId: number,
    propertyTitle: string,
  ) {
    const propertyKey = this.propertyMatchKey(propertyTitle);
    if (!propertyKey) return 0;
    const result = await client.query(
      `SELECT id, payload
       FROM tenant_lead lead
       WHERE COALESCE(payload->>'property', '') <> ''
         AND NOT EXISTS (
           SELECT 1 FROM tenant_lead_property link
           WHERE link.lead_id = lead.id
         )`,
    );
    const matchingIds = result.rows
      .filter((lead: any) => this.propertyMatchKey(lead?.payload?.property) === propertyKey)
      .map((lead: any) => Number(lead.id))
      .filter((id: number) => Number.isInteger(id) && id > 0);
    for (const leadId of matchingIds) {
      await client.query(
        `INSERT INTO tenant_lead_property(lead_id, property_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [leadId, propertyId],
      );
      await client.query(
        `UPDATE tenant_lead
         SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
             updated_at = now()
         WHERE id = $1`,
        [leadId, JSON.stringify({
          primaryPropertyId: propertyId,
          property: propertyTitle,
          propertyListingStatus: 'Listed',
        })],
      );
    }
    return matchingIds.length;
  }

  private propertyMatchKey(value: unknown) {
    return `${value ?? ''}`
      .toLowerCase()
      .replace(/\b(north)\b/g, 'n')
      .replace(/\b(south)\b/g, 's')
      .replace(/\b(east)\b/g, 'e')
      .replace(/\b(west)\b/g, 'w')
      .replace(/\b(street)\b/g, 'st')
      .replace(/\b(road)\b/g, 'rd')
      .replace(/\b(avenue)\b/g, 'ave')
      .replace(/\b(boulevard)\b/g, 'blvd')
      .replace(/\b(drive)\b/g, 'dr')
      .replace(/\b(lane)\b/g, 'ln')
      .replace(/\b(court)\b/g, 'ct')
      .replace(/\b(unit|apartment|apt|suite)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async syncPropertyDocuments(
    client: PoolClient,
    propertyId: number,
    propertyTitle: string,
    input: unknown,
  ) {
    const documents = (Array.isArray(input) ? input : [])
      .filter((item: any) => `${item?.fileUrl ?? ''}`.trim())
      .slice(0, 100);
    const documentKeys = new Set(
      documents
        .map((item: any) => `${item?.fileObjectName ?? item?.fileUrl ?? ''}`.trim())
        .filter(Boolean),
    );
    const managed = await client.query(
      `SELECT id, payload
       FROM tenant_legacy_resource
       WHERE resource = 'documents'
         AND payload->>'propertyId' = $1
         AND payload->>'managedByProperty' = 'true'`,
      [String(propertyId)],
    );
    for (const row of managed.rows) {
      const key = `${row.payload?.fileObjectName ?? row.payload?.fileUrl ?? ''}`.trim();
      if (!documentKeys.has(key)) {
        await client.query(
          `DELETE FROM tenant_legacy_resource
           WHERE resource = 'documents' AND id = $1`,
          [Number(row.id)],
        );
      }
    }

    for (const document of documents) {
      const fileObjectName = `${document?.fileObjectName ?? ''}`.trim();
      const fileUrl = `${document?.fileUrl ?? ''}`.trim();
      const existing = await client.query(
        `SELECT id, payload
         FROM tenant_legacy_resource
         WHERE resource = 'documents'
           AND (($1 <> '' AND payload->>'fileObjectName' = $1)
             OR ($2 <> '' AND payload->>'fileUrl' = $2))
         ORDER BY id DESC
         LIMIT 1`,
        [fileObjectName, fileUrl],
      );
      const current = existing.rows[0]?.payload ?? {};
      const repositoryPayload = {
        accessLevel: current.accessLevel ?? 'AdminOnly',
        category: current.category ?? 'General',
        description: current.description ?? `Uploaded from ${propertyTitle || 'property'}.`,
        documentType: 'Property',
        fileName: `${document?.fileName ?? current.fileName ?? ''}`.trim(),
        fileObjectName: fileObjectName || current.fileObjectName || null,
        fileUrl,
        folder: current.folder ?? 'Properties',
        isTemplate: current.isTemplate === true,
        managedByProperty: current.managedByProperty !== false,
        mimeType: `${document?.mimeType ?? current.mimeType ?? 'application/octet-stream'}`.trim(),
        propertyId,
        propertyTitle,
        requiresSignature: current.requiresSignature === true,
        sizeBytes: Math.max(0, Number(document?.sizeBytes ?? current.sizeBytes) || 0),
        tags: Array.isArray(current.tags) ? current.tags : ['Property'],
        title: `${document?.name ?? current.title ?? document?.fileName ?? 'Property document'}`.trim(),
        versionLabel: current.versionLabel ?? 'v1.0',
      };
      if (existing.rowCount) {
        await client.query(
          `UPDATE tenant_legacy_resource
           SET payload = $2::jsonb, updated_at = now()
           WHERE resource = 'documents' AND id = $1`,
          [Number(existing.rows[0].id), JSON.stringify(repositoryPayload)],
        );
      } else {
        await client.query(
          `INSERT INTO tenant_legacy_resource(resource, payload)
           VALUES ('documents', $1::jsonb)`,
          [JSON.stringify(repositoryPayload)],
        );
      }
    }

    const linked = await client.query(
      `SELECT id
       FROM tenant_legacy_resource
       WHERE resource = 'documents' AND payload->>'propertyId' = $1
       ORDER BY id ASC`,
      [String(propertyId)],
    );
    return linked.rows.map((row) => Number(row.id)).filter((id) => id > 0);
  }

  async deleteProperty(tenant: SaasTenant, body: any) {
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query('DELETE FROM tenant_property WHERE id = $1 RETURNING id', [id]);
      if (!result.rowCount) throw new NotFoundException('Property not found');
      return { id };
    });
  }

  async listLeads(tenant: SaasTenant, query: any) {
    const rows = await this.dashboard.listLeads(tenant);
    const items = rows.map((row: any) => this.leadItem(row));
    if (query?.id) return items.find((item: any) => item.id === Number(query.id)) ?? null;
    const filtered = this.filter(items, query);
    filtered.sort((left: any, right: any) => {
      const leftDate = new Date(left?.lastActivityAt ?? left?.createdAt ?? 0).getTime();
      const rightDate = new Date(right?.lastActivityAt ?? right?.createdAt ?? 0).getTime();
      const dateDelta =
        (Number.isFinite(rightDate) ? rightDate : 0) -
        (Number.isFinite(leftDate) ? leftDate : 0);
      if (dateDelta !== 0) return dateDelta;
      return Number(right?.id ?? 0) - Number(left?.id ?? 0);
    });
    return this.paginate(filtered, query);
  }

  async createLead(tenant: SaasTenant, body: any, actorUserId: number) {
    const created = await this.dashboard.createLead(
      tenant,
      {
        fullName: body?.name ?? body?.fullName,
        email: body?.email,
        phone: body?.phone,
        propertyIds: body?.propertyIds ?? [],
      },
      actorUserId,
    );
    await this.mergeLeadPayload(tenant, Number(created.id), body);
    return this.leadItem(await this.getLeadRow(tenant, Number(created.id)));
  }

  async updateLead(tenant: SaasTenant, body: any) {
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query('SELECT payload FROM tenant_lead WHERE id = $1', [id]);
      if (!current.rowCount) throw new NotFoundException('Lead not found');
      const normalizedBody = this.normalizeLeadPayload(body);
      const payload = { ...(current.rows[0].payload ?? {}), ...normalizedBody };
      const result = await client.query(
        `UPDATE tenant_lead SET full_name = $2, email = NULLIF($3, ''), phone = NULLIF($4, ''),
         status = $5, payload = $6::jsonb, updated_at = now() WHERE id = $1
         RETURNING id, full_name, email, phone, status, payload, created_at, updated_at`,
        [id, `${body?.name ?? body?.fullName ?? ''}`.trim(), `${body?.email ?? ''}`.trim(), `${body?.phone ?? ''}`.trim(), `${body?.stage ?? body?.status ?? 'new'}`, JSON.stringify(payload)],
      );
      if (`${body?.stage ?? body?.status ?? ''}`.toLowerCase() === 'canceled') {
        await client.query(
          `UPDATE tenant_outreach_job
           SET status = 'cancelled',
               last_error = 'Cancelled because this lead was canceled.',
               completed_at = now(), locked_at = NULL, locked_by = NULL,
               updated_at = now()
           WHERE lead_id = $1
             AND direction <> 'Incoming'
             AND status IN ('scheduled', 'retrying', 'paused')`,
          [id],
        );
      }
      return this.leadItem(result.rows[0]);
    });
  }

  async deleteLead(tenant: SaasTenant, body: any) {
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((item: unknown) => Number(item)).filter((item: number) => Number.isInteger(item) && item > 0)
      : [];
    if (ids.length === 0) {
      const id = this.id(body?.id);
      ids.push(id);
    }
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query('BEGIN');
      try {
        const idTexts = ids.map(String);
        await client.query(
          `INSERT INTO tenant_mail_deletion_tombstone(provider, provider_message_id)
           SELECT DISTINCT provider, provider_message_id
           FROM tenant_outreach_job
           WHERE lead_id = ANY($1::bigint[])
             AND direction = 'Incoming'
             AND provider <> ''
             AND provider_message_id <> ''
           ON CONFLICT (provider, provider_message_id) DO NOTHING`,
          [ids],
        );
        await client.query(
          'DELETE FROM tenant_outreach_job WHERE lead_id = ANY($1::bigint[])',
          [ids],
        );
        await client.query(
          `DELETE FROM tenant_legacy_resource
           WHERE payload->>'leadId' = ANY($1::text[])
              OR payload->>'sourceLeadId' = ANY($1::text[])`,
          [idTexts],
        );
        await client.query(
          `DELETE FROM tenant_audit_log
           WHERE metadata->>'leadId' = ANY($1::text[])`,
          [idTexts],
        );
        const result = await client.query(
          'DELETE FROM tenant_lead WHERE id = ANY($1::bigint[]) RETURNING id',
          [ids],
        );
        if (!result.rowCount) throw new NotFoundException('Lead not found');
        await client.query('COMMIT');
        return { deleted: result.rows.map((row: any) => Number(row.id)) };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async dashboardSummary(tenant: SaasTenant) {
    const overview = await this.dashboard.overview(tenant);
    return {
      overview: {
        activeListings: overview.metrics.publishedProperties,
        activeListingsChange: 0,
        newLeadsThisWeek: overview.metrics.leads,
        contactedLeadsThisWeek: 0,
        convertedLeadsThisWeek: 0,
        dealsInProgress: 0,
        closingThisMonth: 0,
        monthlyRevenue: 0,
        monthlyRevenueChange: 0,
      },
      topAgents: [],
      alerts: [],
      visits: [],
    };
  }

  async listShowings(tenant: SaasTenant, query: any) {
    const rows = await this.workflows.listShowings(tenant);
    const items = rows.map((row: any) => ({
      ...row,
      id: Number(row.id),
      propertyId: Number(row.propertyId ?? row.property_id ?? 0),
      leadId: Number(row.leadId ?? row.lead_id ?? 0),
      scheduledAt: row.showingAt ?? row.showing_at,
      status: this.titleCase(row.status || 'scheduled'),
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    }));
    return this.paginate(this.filter(items, query), query);
  }

  async genericList(tenant: SaasTenant, resource: string, query: any) {
    const cleanResource = this.resource(resource);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        'SELECT id, payload, created_at, updated_at FROM tenant_legacy_resource WHERE resource = $1 ORDER BY updated_at DESC',
        [cleanResource],
      );
      const items = result.rows.map((row: any) =>
        cleanResource === 'deals' ? this.dealItem(row) : this.genericItem(row),
      );
      if (query?.id) return items.find((item: any) => item.id === Number(query.id)) ?? null;
      if (query?.slug) return items.find((item: any) => `${item.slug ?? ''}` === `${query.slug}`) ?? null;
      const filtered = this.filter(items, query);
      if (
        ['realtors', 'users-agents', 'lead-assignment-rules', 'lead-outreach-templates', 'lead-history', 'showing-feedback-properties'].includes(cleanResource)
      ) return filtered;
      return this.paginate(filtered, query);
    });
  }

  async genericCreate(tenant: SaasTenant, resource: string, body: any) {
    const cleanResource = this.resource(resource);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `INSERT INTO tenant_legacy_resource(resource, payload) VALUES ($1, $2::jsonb)
         RETURNING id, payload, created_at, updated_at`,
        [cleanResource, JSON.stringify(body ?? {})],
      );
      if (cleanResource === 'documents') {
        await this.syncRepositoryDocumentToProperty(
          client,
          Number(result.rows[0].id),
          result.rows[0].payload ?? {},
        );
      }
      return cleanResource === 'deals'
        ? this.dealItem(result.rows[0])
        : this.genericItem(result.rows[0]);
    });
  }

  async genericUpdate(tenant: SaasTenant, resource: string, body: any) {
    const cleanResource = this.resource(resource);
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query(
        'SELECT payload FROM tenant_legacy_resource WHERE resource = $1 AND id = $2',
        [cleanResource, id],
      );
      if (!current.rowCount) throw new NotFoundException('Record not found');
      const payload = { ...(current.rows[0].payload ?? {}), ...(body ?? {}) };
      const result = await client.query(
        `UPDATE tenant_legacy_resource SET payload = $3::jsonb, updated_at = now()
         WHERE resource = $1 AND id = $2 RETURNING id, payload, created_at, updated_at`,
        [cleanResource, id, JSON.stringify(payload)],
      );
      if (cleanResource === 'documents') {
        await this.syncRepositoryDocumentToProperty(
          client,
          id,
          payload,
          current.rows[0].payload ?? {},
        );
      }
      return cleanResource === 'deals'
        ? this.dealItem(result.rows[0])
        : this.genericItem(result.rows[0]);
    });
  }

  async genericDelete(tenant: SaasTenant, resource: string, body: any) {
    const cleanResource = this.resource(resource);
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = cleanResource === 'documents'
        ? await client.query(
            'SELECT payload FROM tenant_legacy_resource WHERE resource = $1 AND id = $2',
            [cleanResource, id],
          )
        : null;
      const result = await client.query(
        'DELETE FROM tenant_legacy_resource WHERE resource = $1 AND id = $2 RETURNING id',
        [cleanResource, id],
      );
      if (!result.rowCount) throw new NotFoundException('Record not found');
      if (cleanResource === 'documents' && current?.rows[0]?.payload) {
        await this.removeRepositoryDocumentFromProperty(
          client,
          id,
          current.rows[0].payload,
        );
      }
      return { id };
    });
  }

  private async syncRepositoryDocumentToProperty(
    client: PoolClient,
    documentId: number,
    document: any,
    previous: any = {},
  ) {
    const previousPropertyId = Number(previous?.propertyId) || 0;
    const propertyId = Number(document?.propertyId) || 0;
    if (previousPropertyId > 0 && previousPropertyId !== propertyId) {
      await this.removeRepositoryDocumentFromProperty(client, documentId, previous);
    }
    if (document?.documentType !== 'Property' || propertyId <= 0) return;

    const property = await client.query(
      'SELECT title, payload FROM tenant_property WHERE id = $1',
      [propertyId],
    );
    if (!property.rowCount) throw new NotFoundException('Property not found');
    const payload = property.rows[0].payload ?? {};
    const fileObjectName = `${document?.fileObjectName ?? ''}`.trim();
    const fileUrl = `${document?.fileUrl ?? ''}`.trim();
    const nextDocument = {
      fileName: `${document?.fileName ?? ''}`.trim(),
      fileObjectName,
      fileUrl,
      mimeType: `${document?.mimeType ?? 'application/octet-stream'}`.trim(),
      name: `${document?.title ?? document?.fileName ?? 'Property document'}`.trim(),
      sizeBytes: Math.max(0, Number(document?.sizeBytes) || 0),
    };
    const documents = Array.isArray(payload.propertyDocuments)
      ? [...payload.propertyDocuments]
      : [];
    const documentIndex = documents.findIndex((item: any) =>
      (fileObjectName && `${item?.fileObjectName ?? ''}` === fileObjectName) ||
      (fileUrl && `${item?.fileUrl ?? ''}` === fileUrl),
    );
    if (documentIndex >= 0) documents[documentIndex] = nextDocument;
    else documents.push(nextDocument);
    const ids = [...new Set([
      ...(Array.isArray(payload.documentRepositoryItemIds)
        ? payload.documentRepositoryItemIds.map(Number)
        : []),
      documentId,
    ])].filter((id) => id > 0);
    await client.query(
      `UPDATE tenant_property
       SET payload = payload || $2::jsonb, updated_at = now()
       WHERE id = $1`,
      [propertyId, JSON.stringify({
        documentRepositoryItemIds: ids,
        propertyDocuments: documents,
      })],
    );
  }

  private async removeRepositoryDocumentFromProperty(
    client: PoolClient,
    documentId: number,
    document: any,
  ) {
    const propertyId = Number(document?.propertyId) || 0;
    if (propertyId <= 0) return;
    const property = await client.query(
      'SELECT payload FROM tenant_property WHERE id = $1',
      [propertyId],
    );
    if (!property.rowCount) return;
    const payload = property.rows[0].payload ?? {};
    const fileObjectName = `${document?.fileObjectName ?? ''}`.trim();
    const fileUrl = `${document?.fileUrl ?? ''}`.trim();
    const documents = (Array.isArray(payload.propertyDocuments)
      ? payload.propertyDocuments
      : []
    ).filter((item: any) =>
      !(
        (fileObjectName && `${item?.fileObjectName ?? ''}` === fileObjectName) ||
        (fileUrl && `${item?.fileUrl ?? ''}` === fileUrl)
      ),
    );
    const ids = (Array.isArray(payload.documentRepositoryItemIds)
      ? payload.documentRepositoryItemIds.map(Number)
      : []
    ).filter((id: number) => id > 0 && id !== documentId);
    await client.query(
      `UPDATE tenant_property
       SET payload = payload || $2::jsonb, updated_at = now()
       WHERE id = $1`,
      [propertyId, JSON.stringify({
        documentRepositoryItemIds: ids,
        propertyDocuments: documents,
      })],
    );
  }

  async singletonGet(tenant: SaasTenant, resource: string) {
    const key = `legacy_singleton_${this.resource(resource)}`;
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query('SELECT value FROM tenant_setting WHERE key = $1', [key]);
      return result.rows[0]?.value ?? {};
    });
  }

  async singletonSave(tenant: SaasTenant, resource: string, body: any) {
    const key = `legacy_singleton_${this.resource(resource)}`;
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query('SELECT value FROM tenant_setting WHERE key = $1', [key]);
      const value = { ...(current.rows[0]?.value ?? {}), ...(body ?? {}) };
      await client.query(
        `INSERT INTO tenant_setting(key, value) VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, JSON.stringify(value)],
      );
      return value;
    });
  }

  async documentSummary(tenant: SaasTenant) {
    const page = await this.genericList(tenant, 'documents', { page: 1, pageSize: 500 });
    return {
      totalDocuments: page.totalCount,
      recentDocuments: page.items.slice(0, 5),
      byType: [],
      storageBytes: 0,
    };
  }

  syncStatus() {
    return { connected: false, configured: false, syncing: false, lastSyncedAt: null, message: 'Configure this tenant integration in Settings.' };
  }

  leadCollectionFields() {
    return [
      { field: 'name', label: 'Name', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: true },
      { field: 'email', label: 'Email', dataType: 'text', writable: true, suggestedTransform: 'Email', requiredByDefault: false },
      { field: 'phone', label: 'Phone', dataType: 'text', writable: true, suggestedTransform: 'Phone', requiredByDefault: false },
      { field: 'property', label: 'Property', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: false },
      { field: 'budget', label: 'Budget', dataType: 'text', writable: true, suggestedTransform: 'Number', requiredByDefault: false },
      { field: 'creditScore', label: 'Credit Score', dataType: 'text', writable: true, suggestedTransform: 'CreditScore', requiredByDefault: false },
      { field: 'combinedCreditScore', label: 'Combined Credit Score', dataType: 'text', writable: true, suggestedTransform: 'CreditScore', requiredByDefault: false },
      { field: 'monthlyEarning', label: 'Monthly Earning', dataType: 'text', writable: true, suggestedTransform: 'Number', requiredByDefault: false },
      { field: 'combinedMonthlyEarning', label: 'Combined Monthly Earning', dataType: 'text', writable: true, suggestedTransform: 'Number', requiredByDefault: false },
      { field: 'source', label: 'Source', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: false },
      { field: 'interest', label: 'Interest', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: false },
      { field: 'timeline', label: 'Timeline', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: false },
      { field: 'summary', label: 'Summary', dataType: 'text', writable: true, suggestedTransform: 'Text', requiredByDefault: false },
    ];
  }

  async leadCollectionPrepareSource(tenant: SaasTenant, dto: any) {
    const source = await this.tenantLeadCollectionSource(tenant, dto);
    const input = {
      fromAddress: source.sampleFromAddress,
      subject: source.sampleSubject,
      htmlBody: source.sourceHtml,
      textBody: source.sourceText,
    };
    const linkedPageConfig = normalizeLinkedPageConfig(dto?.linkedPageConfig);
    const linked = linkedPageConfig.enabled
      ? await loadConfiguredLinkedPage(input, linkedPageConfig).catch(() => null)
      : null;
    return {
      ...source,
      sourceText: prepareLeadCollectionSource({ htmlBody: source.sourceHtml, textBody: source.sourceText }),
      senderPatterns: this.inferLeadSenderPatterns(source.sampleFromAddress),
      subjectPattern: this.inferLeadSubjectPattern(source.sampleSubject),
      subjectMatchMode: 'Contains',
      bodyFingerprint: [],
      linkedPageConfig,
      linkedPageSampleUrl: linked?.url ?? '',
      linkedPageSourceHtml: linked?.html ?? '',
      linkedPageSourceText: linked?.text ?? '',
      linkedPageStatus: linkedPageConfig.enabled ? (linked ? 'Loaded' : 'No matching public link could be loaded') : 'Disabled',
    };
  }

  async leadCollectionTest(tenant: SaasTenant, dto: any) {
    const prepared = await this.leadCollectionPrepareSource(tenant, dto);
    const baseInput = {
      fromAddress: `${dto?.testFromAddress ?? prepared.sampleFromAddress ?? ''}`,
      subject: `${dto?.testSubject ?? prepared.sampleSubject ?? ''}`,
      htmlBody: `${dto?.testHtml ?? prepared.sourceHtml ?? ''}`,
      textBody: `${dto?.testText ?? prepared.sourceText ?? ''}`,
    };
    const input = prepared.linkedPageSourceText
      ? enrichEmailWithLinkedPage(baseInput, {
          url: prepared.linkedPageSampleUrl,
          html: prepared.linkedPageSourceHtml,
          text: prepared.linkedPageSourceText,
        })
      : baseInput;
    const sourceText = prepareLeadCollectionSource({ htmlBody: input.htmlBody, textBody: input.textBody });
    const mappings = buildLeadCollectionMappings(sourceText, Array.isArray(dto?.mappings) ? dto.mappings : []);
    const senderPatterns = this.stringList(dto?.senderPatterns);
    const template = {
      id: Number(dto?.id) || undefined,
      name: `${dto?.name ?? 'Draft template'}`.trim() || 'Draft template',
      senderPatterns: senderPatterns.length ? senderPatterns : prepared.senderPatterns,
      mailboxTags: this.stringList(dto?.mailboxTags),
      subjectPattern: `${dto?.subjectPattern ?? prepared.subjectPattern ?? ''}`.trim(),
      subjectMatchMode: `${dto?.subjectMatchMode ?? 'Contains'}`,
      bodyFingerprint: buildLeadCollectionFingerprint(sourceText, mappings),
      mappings,
      requiredFields: this.stringList(dto?.requiredFields),
      confidenceThreshold: Number(dto?.confidenceThreshold) || 0.82,
    };
    return parseLeadCollectionTemplate(template, input);
  }

  sequenceSummary() {
    return {
      total: 0, active: 0, paused: 0, cancelled: 0, completed: 0, replied: 0,
      replyRate: 0, stopRate: 0, emailOnly: 0, smsOnly: 0, multiChannel: 0,
      followUpEnabled: 0, averageGapDays: 0, generatedAt: new Date().toISOString(), tips: [],
    };
  }

  async importGeneric(tenant: SaasTenant, resource: string, body: any) {
    const source = Array.isArray(body?.items) ? body.items : Array.isArray(body?.rows) ? body.rows : [];
    const created: any[] = [];
    for (const item of source.slice(0, 1000)) created.push(await this.genericCreate(tenant, resource, item));
    return { imported: created.length, created: created.length, updated: 0, skipped: 0, errors: [] };
  }

  private async tenantLeadCollectionSource(tenant: SaasTenant, dto: any) {
    const sourceMailInboxId = Number(dto?.sourceMailInboxId) || 0;
    if (sourceMailInboxId > 0) {
      return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
        const result = await client.query(
          `SELECT recipient_email, title, body, payload
           FROM tenant_outreach_job
           WHERE id = $1 AND channel = 'Email'`,
          [sourceMailInboxId],
        );
        if (!result.rowCount) throw new NotFoundException('Source inbox email not found.');
        const row = result.rows[0];
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
        return {
          sourceType: 'InboxEmail',
          sourceMailInboxId,
          sourceHtml: `${payload.htmlBody ?? ''}`,
          sourceText: `${row.body ?? ''}`,
          sampleFromAddress: `${row.recipient_email ?? ''}`.trim().toLowerCase(),
          sampleSubject: `${row.title ?? ''}`.trim(),
        };
      });
    }
    const sourceHtml = `${dto?.sourceHtml ?? ''}`;
    const sourceText = `${dto?.sourceText ?? ''}`;
    const requestedType = `${dto?.sourceType ?? ''}`;
    const sourceType = ['PastedHtml', 'PastedText', 'UploadedHtml'].includes(requestedType)
      ? requestedType
      : sourceHtml
        ? 'PastedHtml'
        : 'PastedText';
    return {
      sourceType,
      sourceMailInboxId: null,
      sourceHtml,
      sourceText,
      sampleFromAddress: `${dto?.sampleFromAddress ?? ''}`.trim().toLowerCase(),
      sampleSubject: `${dto?.sampleSubject ?? ''}`.trim(),
    };
  }

  private inferLeadSenderPatterns(value: unknown) {
    const address = `${value ?? ''}`.trim().toLowerCase();
    if (!address) return [];
    const domain = address.split('@')[1] ?? '';
    const root = domain.split('.').slice(-2).join('.');
    return [...new Set([address, domain ? `*@${domain}` : '', root && root !== domain ? `*@${root}` : ''].filter(Boolean))];
  }

  private inferLeadSubjectPattern(value: unknown) {
    return prepareLeadCollectionSource({ textBody: `${value ?? ''}` })
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
      .replace(/\b\d[\d,.$-]*\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 160);
  }

  private stringList(value: unknown) {
    if (typeof value === 'string') value = value.split(',');
    return [...new Set((Array.isArray(value) ? value : []).map((item) => `${item ?? ''}`.trim()).filter(Boolean))];
  }

  private propertyItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    return {
      ...payload,
      id: Number(row.id),
      slug: payload.slug || `property-${row.id}`,
      title: row.title,
      propertyType: payload.propertyType || 'Residential',
      listingType: payload.listingType || 'ForSale',
      price: `${payload.price ?? ''}`,
      status: payload.status || this.legacyPropertyStatus(row.status),
      location: payload.location || '',
      exactLocation: payload.exactLocation || '',
      bedRoom: `${payload.bedRoom ?? ''}`,
      bathRoom: `${payload.bathRoom ?? ''}`,
      width: `${payload.width ?? ''}`,
      description: payload.description || '',
      extraDescription: payload.extraDescription || '',
      imageUrls: Array.isArray(payload.imageUrls) ? payload.imageUrls : [],
      imageObjectNames: Array.isArray(payload.imageObjectNames) ? payload.imageObjectNames : [],
      keyAmenities: Array.isArray(payload.keyAmenities) ? payload.keyAmenities : [],
      documentRepositoryItemIds: Array.isArray(payload.documentRepositoryItemIds) ? payload.documentRepositoryItemIds : [],
      neighborhoodInsights: Array.isArray(payload.neighborhoodInsights) ? payload.neighborhoodInsights : [],
      preQuestions: Array.isArray(payload.preQuestions) ? payload.preQuestions : [],
      sellPrediction: payload.sellPrediction || { label: 'Not enough data', confidence: 0 },
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  private leadItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const properties = Array.isArray(row.properties)
      ? row.properties
      : Array.isArray(payload.properties) ? payload.properties : [];
    const propertyListingStatus = properties.length
      ? properties.some((property: any) => property?.status === 'published') ? 'Listed' : 'NotListed'
      : payload.propertyListingStatus === 'Listed' ? 'Listed' : 'NotListed';
    const notes = Array.isArray(payload.notes)
      ? payload.notes
      : `${payload.notes ?? ''}`.trim()
        ? [`${payload.notes}`]
        : [];
    return {
      ...payload,
      id: Number(row.id),
      name: row.full_name ?? row.fullName ?? payload.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      stage: payload.stage || this.titleCase(row.status || 'new'),
      summary: payload.summary || '',
      property: payload.property || '',
      propertyId: payload.propertyId ?? null,
      propertyListingStatus,
      priority: payload.priority || 'Warm',
      source: payload.source || 'Manual',
      budget: payload.budget || '',
      creditScore: payload.creditScore || '',
      combinedCreditScore: payload.combinedCreditScore || '',
      monthlyEarning: payload.monthlyEarning || '',
      combinedMonthlyEarning: payload.combinedMonthlyEarning || '',
      interest: payload.interest || '',
      timeline: payload.timeline || '',
      preferredLocation: payload.preferredLocation || '',
      notes,
      agent: payload.agent || '',
      agentId: payload.agentId ?? null,
      inBoard: payload.inBoard === true,
      nextActionDate: payload.nextActionDate ?? null,
      nextActionType: payload.nextActionType || 'Review lead',
      followUpStatus: payload.followUpStatus || 'Open',
      assignedAgentId: payload.assignedAgentId ?? null,
      assignedAgentName: payload.assignedAgentName ?? null,
      linkedDealId: payload.linkedDealId ?? null,
      linkedDealTitle: payload.linkedDealTitle ?? null,
      nextFollowUpAt: payload.nextFollowUpAt ?? null,
      lastActivityAt: payload.lastActivityAt ?? row.updated_at ?? row.updatedAt,
      isFollowUpOverdue: Boolean(payload.isFollowUpOverdue),
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      properties,
    };
  }

  private genericItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    return {
      ...payload,
      id: Number(row.id),
      createdAt: payload.createdAt ?? row.created_at,
      updatedAt: payload.updatedAt ?? row.updated_at,
    };
  }

  private dealItem(row: any) {
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    const allowedStages = new Set([
      'OfferMade', 'OfferAccepted', 'UnderContract', 'Inspection',
      'Financing', 'Closing', 'Completed', 'Canceled',
    ]);
    const allowedTypes = new Set(['Residential', 'Commercial', 'Industrial']);
    const stage = allowedStages.has(payload.stage) ? payload.stage : 'OfferMade';
    const type = allowedTypes.has(payload.type) ? payload.type : 'Residential';
    return {
      ...payload,
      id: Number(row.id),
      title: `${payload.title ?? ''}`,
      client: `${payload.client ?? payload.sourceLeadName ?? ''}`,
      type,
      stage,
      value: Number(payload.value) || 0,
      commissionRate: Number(payload.commissionRate) || 0,
      commissionAmount: Number(payload.commissionAmount) || 0,
      commissionStatus: `${payload.commissionStatus ?? 'Estimated'}`,
      commissionPayoutNote: `${payload.commissionPayoutNote ?? ''}`,
      deadline: `${payload.deadline ?? ''}`,
      expectedClosingDate: payload.expectedClosingDate ?? null,
      note: `${payload.note ?? ''}`,
      agent: `${payload.agent ?? ''}`,
      agentId: Number(payload.agentId) || null,
      sourceLeadId: Number(payload.sourceLeadId) || null,
      sourceLeadName: `${payload.sourceLeadName ?? ''}`,
      checklistItems: Array.isArray(payload.checklistItems) ? payload.checklistItems : [],
      createdAt: payload.createdAt ?? row.created_at,
      updatedAt: payload.updatedAt ?? row.updated_at,
    };
  }

  private async mergeLeadPayload(tenant: SaasTenant, leadId: number, body: any) {
    await this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query(
        `UPDATE tenant_lead
         SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb, updated_at = now()
         WHERE id = $1`,
        [leadId, JSON.stringify(this.normalizeLeadPayload(body))],
      );
    });
  }

  private normalizeLeadPayload(input: any) {
    const payload = { ...(input ?? {}) };
    if (Object.prototype.hasOwnProperty.call(payload, 'creditScore')) {
      payload.creditScore = this.normalizeCreditScore(payload.creditScore);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'combinedCreditScore')) {
      payload.combinedCreditScore = this.normalizeCreditScore(payload.combinedCreditScore);
    }
    return payload;
  }

  private normalizeCreditScore(value: unknown) {
    const candidates = `${value ?? ''}`.match(/\b\d{3}\b/g) ?? [];
    return candidates.find((candidate) => {
      const score = Number(candidate);
      return score >= 300 && score <= 850;
    }) ?? '';
  }

  private async getLeadRow(tenant: SaasTenant, leadId: number) {
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        `SELECT id, full_name, email, phone, status, payload, created_at, updated_at
         FROM tenant_lead WHERE id = $1`,
        [leadId],
      );
      if (!result.rowCount) throw new NotFoundException('Lead not found');
      return result.rows[0];
    });
  }

  private paginate(items: any[], query: any) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(query?.pageSize) || 20));
    const totalCount = items.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      totalCount,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  private filter(items: any[], query: any) {
    const search = `${query?.search ?? query?.q ?? ''}`.trim().toLowerCase();
    const status = `${query?.status ?? ''}`.trim().toLowerCase();
    const dateKey = `${query?.date ?? query?.createdDate ?? ''}`.trim();
    const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
    return items.filter((item) => {
      if (status && `${item?.status ?? item?.stage ?? ''}`.toLowerCase() !== status) return false;
      if (dateParts) {
        const mailActivity = new Date(
          item?.lastActivityAt ?? item?.last_activity_at ?? item?.createdAt ?? item?.created_at ?? NaN,
        );
        if (!Number.isFinite(mailActivity.getTime())) return false;
        const sameDay =
          mailActivity.getUTCFullYear() === Number(dateParts[1]) &&
          mailActivity.getUTCMonth() === Number(dateParts[2]) - 1 &&
          mailActivity.getUTCDate() === Number(dateParts[3]);
        if (!sameDay) return false;
      }
      if (!search) return true;
      return JSON.stringify(item).toLowerCase().includes(search);
    });
  }

  private storagePropertyStatus(value: unknown) {
    const status = `${value ?? ''}`.trim().toLowerCase();
    if (['open', 'active', 'published', 'forsale', 'forrent'].includes(status)) return 'published';
    if (['closed', 'sold', 'rented', 'unpublished', 'inactive', 'archived'].includes(status)) return 'archived';
    return 'draft';
  }

  private legacyPropertyStatus(value: unknown) {
    const status = `${value ?? ''}`.trim().toLowerCase();
    if (status === 'published') return 'Open';
    if (status === 'archived') return 'Closed';
    return 'Draft';
  }

  private resource(value: string) {
    const clean = `${value ?? ''}`.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!clean) throw new BadRequestException('Resource is required');
    return clean.slice(0, 100);
  }

  private id(value: unknown) {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('A valid id is required');
    return id;
  }

  private titleCase(value: string) {
    return value ? value[0].toUpperCase() + value.slice(1) : value;
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new BadRequestException('Tenant database is not ready');
    return tenant.databaseName;
  }
}
