import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

const MODULES = [
  'portfolio', 'units', 'tenants', 'leases', 'staff', 'technicians', 'vendors',
  'vendor-quotes', 'tickets', 'work-orders', 'recurring-maintenance', 'inspections',
  'assets', 'billing', 'finance', 'messages', 'notifications', 'documents', 'public-links',
] as const;

@Injectable()
export class TenantPropertyOperationsService {
  constructor(
    private readonly databases: TenantDatabaseService,
    private readonly workspaceSettings: TenantWorkspaceSettingsService,
  ) {}

  listModules() {
    return MODULES.map((key) => ({ key, label: key.replaceAll('-', ' ') }));
  }

  async listWorkspaces(tenant: SaasTenant) {
    return this.withTenant(tenant, async (client) => {
      const result = await client.query(`
        SELECT id AS "propertyId", title AS "propertyTitle", status AS "propertyStatus", payload
        FROM tenant_property
        ORDER BY updated_at DESC, id DESC
      `);
      return result.rows.map((row: any) => this.workspace(row));
    });
  }

  async importProperties(tenant: SaasTenant, input: unknown) {
    if (!Array.isArray(input)) throw new BadRequestException('Properties are required');
    const ids = input.map((item: any) => Number(item?.propertyId)).filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length) return [];
    return this.withTenant(tenant, async (client) => {
      const result = await client.query(
        `SELECT id AS "propertyId", title AS "propertyTitle", status AS "propertyStatus", payload
         FROM tenant_property WHERE id = ANY($1::bigint[])`,
        [ids],
      );
      return result.rows.map((row: any) => this.workspace(row));
    });
  }

  async listRecords(tenant: SaasTenant, propertyId: number, moduleKey?: string) {
    return this.withTenant(tenant, async (client) => {
      await this.requireProperty(client, propertyId);
      const values: unknown[] = [propertyId];
      const moduleFilter = moduleKey ? ' AND module_key = $2' : '';
      if (moduleKey) values.push(moduleKey);
      const result = await client.query(
        `SELECT id, property_id AS "propertyId", module_key AS "moduleKey", record_type AS "recordType",
                title, description, status, priority, contact_name AS "contactName",
                contact_email AS "contactEmail", contact_phone AS "contactPhone",
                amount, due_at AS "dueAt", payload, created_at AS "createdAt", updated_at AS "updatedAt"
         FROM tenant_property_operations_record WHERE property_id = $1${moduleFilter}
         ORDER BY updated_at DESC, id DESC`, values,
      );
      return result.rows;
    });
  }

  async saveRecord(tenant: SaasTenant, body: any) {
    const propertyId = this.positiveId(body?.propertyId, 'Property');
    const moduleKey = this.clean(body?.moduleKey, 80) || 'portfolio';
    const title = this.clean(body?.title, 240);
    if (!title) throw new BadRequestException('Title is required');
    return this.withTenant(tenant, async (client) => {
      await this.requireProperty(client, propertyId);
      const id = Number(body?.id);
      const values = [
        propertyId, moduleKey, this.clean(body?.recordType, 80) || moduleKey,
        title, this.clean(body?.description, 10000), this.clean(body?.status, 60) || 'active',
        this.clean(body?.priority, 40) || 'medium', this.clean(body?.contactName, 160),
        this.clean(body?.contactEmail, 240), this.clean(body?.contactPhone, 80),
        Number.isFinite(Number(body?.amount)) ? Number(body.amount) : null,
        body?.dueAt ? new Date(body.dueAt) : null, JSON.stringify(body?.payload ?? {}),
      ];
      const result = Number.isInteger(id) && id > 0
        ? await client.query(
            `UPDATE tenant_property_operations_record SET property_id=$1,module_key=$2,record_type=$3,title=$4,
             description=$5,status=$6,priority=$7,contact_name=$8,contact_email=$9,contact_phone=$10,
             amount=$11,due_at=$12,payload=$13::jsonb,updated_at=now() WHERE id=$14 RETURNING *`,
            [...values, id],
          )
        : await client.query(
            `INSERT INTO tenant_property_operations_record(property_id,module_key,record_type,title,description,status,
             priority,contact_name,contact_email,contact_phone,amount,due_at,payload)
             VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING *`, values,
          );
      if (!result.rowCount) throw new NotFoundException('Property operations record not found');
      return this.record(result.rows[0]);
    });
  }

  async deleteRecord(tenant: SaasTenant, id: number) {
    return this.withTenant(tenant, async (client) => {
      const result = await client.query('DELETE FROM tenant_property_operations_record WHERE id = $1', [id]);
      if (!result.rowCount) throw new NotFoundException('Property operations record not found');
      return { deleted: true };
    });
  }

  async getSettings(tenant: SaasTenant) {
    return this.withTenant(tenant, async (client) => {
      const result = await client.query("SELECT value FROM tenant_setting WHERE key = 'property_operations_settings'");
      const identity = await client.query("SELECT value FROM tenant_setting WHERE key = 'tenant_identity'");
      const branding = await client.query("SELECT value FROM tenant_setting WHERE key = 'branding'");
      return {
        businessName: identity.rows[0]?.value?.businessName ?? tenant.businessName,
        logoUrl: branding.rows[0]?.value?.logoUrl ?? '',
        brandColor: branding.rows[0]?.value?.primaryColor ?? '#4343d5',
        ...(result.rows[0]?.value ?? {}),
      };
    });
  }

  async updateSettings(tenant: SaasTenant, body: any) {
    const current = await this.getSettings(tenant);
    const value = { ...current, ...(body ?? {}) };
    return this.withTenant(tenant, async (client) => {
      await client.query(
        `INSERT INTO tenant_setting(key,value) VALUES('property_operations_settings',$1::jsonb)
         ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
        [JSON.stringify(value)],
      );
      return value;
    });
  }

  async getAnalytics(tenant: SaasTenant, propertyId?: number) {
    return this.withTenant(tenant, async (client) => {
      const values: unknown[] = [];
      const propertyFilter = propertyId ? ' WHERE property_id = $1' : '';
      if (propertyId) values.push(propertyId);
      const properties = await client.query('SELECT count(*)::int AS count FROM tenant_property');
      const records = await client.query(
        `SELECT module_key, status, count(*)::int AS count, COALESCE(sum(amount),0)::numeric AS amount
         FROM tenant_property_operations_record${propertyFilter}
         GROUP BY module_key, status`, values,
      );
      const recordsByModule: Record<string, number> = {};
      const recordsByStatus: Record<string, number> = {};
      let totalAmount = 0;
      for (const row of records.rows) {
        recordsByModule[row.module_key] = (recordsByModule[row.module_key] ?? 0) + Number(row.count);
        recordsByStatus[row.status] = (recordsByStatus[row.status] ?? 0) + Number(row.count);
        totalAmount += Number(row.amount ?? 0);
      }
      return {
        importedProperties: Number(properties.rows[0]?.count ?? 0),
        recordsByModule,
        recordsByStatus,
        openRecords: Object.entries(recordsByStatus).filter(([key]) => !['closed','completed','done'].includes(key.toLowerCase())).reduce((sum,[,count]) => sum + count, 0),
        totalIncome: totalAmount,
        totalExpense: 0,
        netOperatingAmount: totalAmount,
      };
    });
  }

  async getAiSummary(tenant: SaasTenant, propertyId?: number) {
    const config: any = await this.workspaceSettings.getRawAiProvider(tenant);
    const providerName = this.clean(config?.providerName, 80);
    const provider = providerName.toLowerCase();
    const model = this.clean(config?.model, 160);
    const baseUrl = this.clean(config?.baseUrl, 1000).replace(/\/+$/, '');
    const apiKey = this.clean(config?.apiKey, 4000);
    if (!providerName || !model || !baseUrl || (!apiKey && provider !== 'ollama')) {
      throw new BadRequestException('Configure this tenant AI provider in Workspace Integrations first.');
    }

    const endpoint = this.aiEndpoint(baseUrl, provider);
    const analytics = await this.getAnalytics(tenant, propertyId);
    const records = await this.withTenant(tenant, async (client) => {
      const result = await client.query(
        `SELECT property_id AS "propertyId", module_key AS "moduleKey", record_type AS "recordType",
                title, description, status, priority, amount, due_at AS "dueAt"
         FROM tenant_property_operations_record
         WHERE ($1::bigint IS NULL OR property_id = $1)
         ORDER BY due_at NULLS LAST, updated_at DESC
         LIMIT 60`,
        [propertyId ?? null],
      );
      return result.rows;
    });
    const messages = [
      {
        role: 'system',
        content: 'You are a property operations assistant. Use only the supplied tenant data. Return one JSON object with keys summary, risks, priorities, and actions. risks/priorities/actions must be arrays. Never invent records or data from another tenant.',
      },
      { role: 'user', content: JSON.stringify({ analytics, records }) },
    ];
    const value = await this.callTenantAi(endpoint, provider, model, apiKey, messages);
    return {
      configured: true,
      provider: providerName,
      model,
      generatedAt: new Date().toISOString(),
      propertyId: propertyId ?? null,
      ...this.object(value),
    };
  }

  async getActivity(tenant: SaasTenant, propertyId?: number) {
    return this.withTenant(tenant, async (client) => {
      const result = await client.query(
        `SELECT id, action, summary, metadata, created_at AS "createdAt"
         FROM tenant_audit_log
         WHERE ($1::bigint IS NULL OR (metadata->>'propertyId')::bigint = $1)
         ORDER BY created_at DESC LIMIT 100`,
        [propertyId ?? null],
      );
      return result.rows;
    });
  }

  private aiEndpoint(baseUrl: string, provider: string) {
    let url: URL;
    try {
      url = new URL(baseUrl);
    } catch {
      throw new BadRequestException('Tenant AI base URL is invalid.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Tenant AI base URL must use HTTP or HTTPS.');
    }
    return provider === 'ollama' ? `${baseUrl}/api/chat` : `${baseUrl}/chat/completions`;
  }

  private async callTenantAi(
    endpoint: string,
    provider: string,
    model: string,
    apiKey: string,
    messages: Array<{ role: string; content: string }>,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.envInt('TENANT_AI_TIMEOUT_MS', 30_000, 5_000, 120_000));
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider === 'ollama' ? {} : { Authorization: `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(provider === 'ollama'
          ? { model, messages, format: 'json', stream: false }
          : { model, messages, response_format: { type: 'json_object' }, temperature: 0 }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        throw new BadRequestException(`Tenant AI provider returned HTTP ${response.status}${detail ? `: ${detail}` : ''}`);
      }
      const data: any = await response.json();
      const content = provider === 'ollama'
        ? data?.message?.content
        : data?.choices?.[0]?.message?.content;
      if (!content) throw new BadRequestException('Tenant AI provider returned an empty response.');
      return this.parseAiJson(content);
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        throw new BadRequestException('Tenant AI provider timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseAiJson(value: unknown) {
    const text = `${value ?? ''}`.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(text);
    } catch {
      throw new BadRequestException('Tenant AI provider did not return valid JSON.');
    }
  }

  private envInt(key: string, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${process.env[key] ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }

  private async requireProperty(client: any, propertyId: number) {
    const result = await client.query('SELECT id FROM tenant_property WHERE id = $1', [propertyId]);
    if (!result.rowCount) throw new NotFoundException('Property not found in this tenant');
  }

  private workspace(row: any) {
    const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
    return {
      propertyId: Number(row.propertyId),
      propertyTitle: row.propertyTitle,
      propertyLocation: payload.location ?? payload.address ?? '',
      propertyType: payload.propertyType ?? '',
      propertyStatus: row.propertyStatus,
      thumbnailUrl: payload.thumbnailUrl ?? payload.imageUrl ?? '',
      propertySlug: payload.slug ?? `property-${row.propertyId}`,
    };
  }

  private record(row: any) {
    return {
      id: Number(row.id),
      propertyId: Number(row.property_id ?? row.propertyId),
      moduleKey: row.module_key ?? row.moduleKey,
      recordType: row.record_type ?? row.recordType,
      title: row.title,
      description: row.description ?? '',
      status: row.status ?? 'active',
      priority: row.priority ?? 'medium',
      contactName: row.contact_name ?? row.contactName ?? '',
      contactEmail: row.contact_email ?? row.contactEmail ?? '',
      contactPhone: row.contact_phone ?? row.contactPhone ?? '',
      amount: row.amount == null ? null : Number(row.amount),
      dueAt: row.due_at ?? row.dueAt ?? null,
      payload: row.payload ?? {},
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  private object(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private clean(value: unknown, max: number) {
    return `${value ?? ''}`.trim().slice(0, max);
  }

  private positiveId(value: unknown, label: string) {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new BadRequestException(`${label} is required`);
    return id;
  }

  private withTenant<T>(tenant: SaasTenant, work: (client: any) => Promise<T>) {
    if (!tenant.databaseName) throw new BadRequestException('Tenant database is not ready');
    return this.databases.withTenantClient(tenant.databaseName, work);
  }
}
