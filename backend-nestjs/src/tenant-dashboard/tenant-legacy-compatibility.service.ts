import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    return this.propertyItem(row);
  }

  async updateProperty(tenant: SaasTenant, body: any) {
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const current = await client.query('SELECT payload FROM tenant_property WHERE id = $1', [id]);
      if (!current.rowCount) throw new NotFoundException('Property not found');
      const payload = { ...(current.rows[0].payload ?? {}), ...(body ?? {}) };
      const result = await client.query(
        `UPDATE tenant_property SET title = $2, status = $3, payload = $4::jsonb, updated_at = now()
         WHERE id = $1 RETURNING id, title, status, payload, created_at, updated_at`,
        [id, `${body?.title ?? payload.title ?? ''}`.trim(), this.storagePropertyStatus(body?.status), JSON.stringify(payload)],
      );
      return this.propertyItem(result.rows[0]);
    });
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
    return this.paginate(this.filter(items, query), query);
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
      const payload = { ...(current.rows[0].payload ?? {}), ...(body ?? {}) };
      const result = await client.query(
        `UPDATE tenant_lead SET full_name = $2, email = NULLIF($3, ''), phone = NULLIF($4, ''),
         status = $5, payload = $6::jsonb, updated_at = now() WHERE id = $1
         RETURNING id, full_name, email, phone, status, payload, created_at, updated_at`,
        [id, `${body?.name ?? body?.fullName ?? ''}`.trim(), `${body?.email ?? ''}`.trim(), `${body?.phone ?? ''}`.trim(), `${body?.stage ?? body?.status ?? 'new'}`, JSON.stringify(payload)],
      );
      return this.leadItem(result.rows[0]);
    });
  }

  async deleteLead(tenant: SaasTenant, body: any) {
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query('DELETE FROM tenant_lead WHERE id = $1 RETURNING id', [id]);
      if (!result.rowCount) throw new NotFoundException('Lead not found');
      return { id };
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
      const items = result.rows.map((row: any) => this.genericItem(row));
      if (query?.id) return items.find((item: any) => item.id === Number(query.id)) ?? null;
      if (query?.slug) return items.find((item: any) => `${item.slug ?? ''}` === `${query.slug}`) ?? null;
      const filtered = this.filter(items, query);
      if (
        ['realtors', 'users-agents', 'lead-assignment-rules', 'lead-outreach-templates', 'showing-feedback-properties'].includes(cleanResource)
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
      return this.genericItem(result.rows[0]);
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
      return this.genericItem(result.rows[0]);
    });
  }

  async genericDelete(tenant: SaasTenant, resource: string, body: any) {
    const cleanResource = this.resource(resource);
    const id = this.id(body?.id);
    return this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      const result = await client.query(
        'DELETE FROM tenant_legacy_resource WHERE resource = $1 AND id = $2 RETURNING id',
        [cleanResource, id],
      );
      if (!result.rowCount) throw new NotFoundException('Record not found');
      return { id };
    });
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
    return {
      ...payload,
      id: Number(row.id),
      name: row.full_name ?? row.fullName ?? payload.name ?? '',
      email: row.email ?? '',
      phone: row.phone ?? '',
      stage: payload.stage || this.titleCase(row.status || 'new'),
      priority: payload.priority || 'Medium',
      source: payload.source || 'Manual',
      budget: payload.budget || '',
      preferredLocation: payload.preferredLocation || '',
      notes: payload.notes || '',
      assignedAgentId: payload.assignedAgentId ?? null,
      assignedAgentName: payload.assignedAgentName ?? null,
      linkedDealId: payload.linkedDealId ?? null,
      linkedDealTitle: payload.linkedDealTitle ?? null,
      nextFollowUpAt: payload.nextFollowUpAt ?? null,
      lastActivityAt: payload.lastActivityAt ?? row.updated_at ?? row.updatedAt,
      isFollowUpOverdue: Boolean(payload.isFollowUpOverdue),
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      properties: row.properties ?? payload.properties ?? [],
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

  private async mergeLeadPayload(tenant: SaasTenant, leadId: number, body: any) {
    await this.databases.withTenantClient(this.databaseName(tenant), async (client) => {
      await client.query(
        `UPDATE tenant_lead
         SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb, updated_at = now()
         WHERE id = $1`,
        [leadId, JSON.stringify(body ?? {})],
      );
    });
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
    return items.filter((item) => {
      if (status && `${item?.status ?? item?.stage ?? ''}`.toLowerCase() !== status) return false;
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
