import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantChatbotService } from './tenant-chatbot.service';

@Injectable()
export class TenantChatbotWorkerService {
  private readonly logger = new Logger(TenantChatbotWorkerService.name);
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly chatbot: TenantChatbotService,
  ) {}

  @Cron('*/20 * * * * *')
  async processAllTenants() {
    if (this.running || process.env.TENANT_CHATBOT_WORKER_ENABLED === 'false') return;
    this.running = true;
    try {
      const tenants = await this.tenants.find({
        where: { databaseStatus: 'ready' } as any,
        order: { id: 'ASC' },
      });
      for (const tenant of tenants) {
        if (!tenant.databaseName || !tenant.isActive || tenant.isBlocked) continue;
        try {
          await this.processTenant(tenant);
        } catch (error) {
          this.logger.error(
            `Chatbot inbound processing failed for ${tenant.databaseName}: ${message(error)}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }

  async processTenant(tenant: SaasTenant) {
    const rows = await this.databases.withTenantClient(
      this.databaseName(tenant),
      async (client) => (
        await client.query(
          [
            'SELECT job.id, job.lead_id AS "leadId", job.channel, job.body,',
            'job.provider_message_id AS "providerMessageId",',
            'linked.property_id AS "propertyId"',
            'FROM tenant_outreach_job job',
            'LEFT JOIN LATERAL (SELECT property_id FROM tenant_lead_property',
            'WHERE lead_id = job.lead_id ORDER BY created_at DESC LIMIT 1) linked ON true',
            "WHERE job.direction = 'Incoming' AND job.status = 'received'",
            "AND job.channel IN ('Email', 'SMS') AND job.lead_id IS NOT NULL",
            'AND NOT EXISTS (SELECT 1 FROM tenant_chatbot_processed_inbound done',
            'WHERE done.outreach_job_id = job.id)',
            'ORDER BY COALESCE(job.occurred_at, job.created_at), job.id LIMIT 25',
          ].join(' '),
        )
      ).rows,
    );
    let processed = 0;
    let failed = 0;
    for (const row of rows) {
      const claimed = await this.databases.withTenantClient(
        this.databaseName(tenant),
        async (client) => client.query(
          [
            'INSERT INTO tenant_chatbot_processed_inbound(outreach_job_id)',
            'VALUES ($1) ON CONFLICT DO NOTHING RETURNING outreach_job_id',
          ].join(' '),
          [row.id],
        ),
      );
      if (!claimed.rows.length) continue;
      try {
        await this.chatbot.handleMessage(tenant, {
          channel: row.channel === 'Email' ? 'EMAIL' : 'SMS',
          audience: 'LEAD',
          leadId: Number(row.leadId),
          propertyId: Number(row.propertyId) || null,
          sessionId: `${String(row.channel).toLowerCase()}:${row.leadId}`,
          idempotencyKey: `inbound:${row.id}`,
          body: String(row.body ?? '').slice(0, 4_000),
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        await this.databases.withTenantClient(
          this.databaseName(tenant),
          async (client) => client.query(
            'DELETE FROM tenant_chatbot_processed_inbound WHERE outreach_job_id = $1',
            [row.id],
          ),
        );
        this.logger.warn(`Chatbot inbound ${row.id} will retry: ${message(error)}`);
      }
    }
    return { processed, failed };
  }

  private databaseName(tenant: SaasTenant) {
    if (!tenant.databaseName) throw new Error('Tenant database is not ready.');
    return tenant.databaseName;
  }
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
