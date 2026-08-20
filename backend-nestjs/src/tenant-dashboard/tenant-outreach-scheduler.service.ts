import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { PoolClient } from 'pg';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import {
  PermanentTenantDeliveryError,
  TenantOutreachDeliveryService,
} from './tenant-outreach-delivery.service';
import type {
  TenantOutreachJob,
  TenantOutreachStatus,
} from './tenant-outreach.service';

@Injectable()
export class TenantOutreachSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(TenantOutreachSchedulerService.name);
  private readonly workerId = `${process.pid}-${randomUUID()}`;
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly delivery: TenantOutreachDeliveryService,
  ) {}

  async onModuleInit() {
    const results = await this.databases.migrateAllTenantDatabases();
    const failed = results.filter((item) => !item.success);
    if (failed.length > 0) {
      this.logger.error(
        `Tenant migration failed for ${failed.length} database(s): ${failed
          .map((item) => `${item.databaseName}: ${item.error}`)
          .join('; ')}`,
      );
    }
  }

  @Cron('*/15 * * * * *')
  async processTenantQueues() {
    if (this.running) return;
    this.running = true;
    try {
      const tenants = await this.tenantRepository.find({
        where: { databaseStatus: 'ready' } as any,
        order: { id: 'ASC' },
      });
      const ready = tenants.filter(
        (tenant) => Boolean(tenant.databaseName) && tenant.isActive && !tenant.isBlocked,
      );
      await this.withConcurrency(
        ready,
        this.clamp(process.env.TENANT_JOB_TENANT_CONCURRENCY, 4, 1, 12),
        async (tenant) => {
          try {
            await this.processTenant(tenant);
          } catch (error) {
            this.logger.error(
              `Tenant queue failed for ${tenant.databaseName}: ${this.message(error)}`,
            );
          }
        },
      );
    } finally {
      this.running = false;
    }
  }

  private async processTenant(tenant: SaasTenant) {
    const databaseName = tenant.databaseName!;
    await this.recoverAbandoned(databaseName);
    const settings = await this.retrySettings(databaseName);
    const jobs: TenantOutreachJob[] = await this.claimDueJobs(
      databaseName,
      this.clamp(process.env.TENANT_JOB_BATCH_SIZE, 25, 1, 100),
    );
    if (jobs.length === 0) return;

    await this.withConcurrency(
      jobs,
      this.clamp(process.env.TENANT_JOB_DELIVERY_CONCURRENCY, 2, 1, 5),
      (job) => this.deliverClaimedJob(databaseName, job, settings.retryBaseSeconds),
    );
  }

  private async claimDueJobs(databaseName: string, batchSize: number) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const result = await client.query<TenantOutreachJob>(
          `WITH candidates AS (
             SELECT id
             FROM tenant_outreach_job
             WHERE status IN ('scheduled', 'retrying')
               AND scheduled_at <= now()
               AND next_attempt_at <= now()
             ORDER BY next_attempt_at ASC, scheduled_at ASC, id ASC
             FOR UPDATE SKIP LOCKED
             LIMIT $1
           )
           UPDATE tenant_outreach_job AS job
           SET status = 'processing',
               attempt_count = job.attempt_count + 1,
               locked_at = now(),
               locked_by = $2,
               updated_at = now()
           FROM candidates
           WHERE job.id = candidates.id
           RETURNING job.*`,
          [batchSize, this.workerId],
        );
        for (const job of result.rows) {
          await this.recordEvent(
            client,
            job.id,
            null,
            'processing',
            job.attempt_count,
            `Claimed by tenant worker ${this.workerId}.`,
          );
        }
        await client.query('COMMIT');
        return result.rows;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  private async deliverClaimedJob(
    databaseName: string,
    job: TenantOutreachJob,
    retryBaseSeconds: number,
  ) {
    try {
      const result = await this.delivery.deliver(databaseName, job);
      await this.databases.withTenantClient(databaseName, async (client) => {
        await client.query('BEGIN');
        try {
          const updated = await client.query<TenantOutreachJob>(
            `UPDATE tenant_outreach_job
             SET status = 'sent',
                 provider_message_id = COALESCE(provider_message_id, $3),
                 last_error = '',
                 completed_at = now(),
                 locked_at = NULL,
                 locked_by = NULL,
                 updated_at = now()
             WHERE id = $1 AND status = 'processing' AND locked_by = $2
             RETURNING *`,
            [job.id, this.workerId, result.providerMessageId],
          );
          if (updated.rows[0]) {
            await this.recordEvent(
              client,
              job.id,
              'processing',
              'sent',
              updated.rows[0].attempt_count,
              'Provider accepted the tenant message.',
              { providerMessageId: result.providerMessageId },
            );
          }
          await client.query('COMMIT');
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    } catch (error) {
      await this.finishFailure(databaseName, job, error, retryBaseSeconds);
    }
  }

  private async finishFailure(
    databaseName: string,
    job: TenantOutreachJob,
    error: unknown,
    retryBaseSeconds: number,
  ) {
    const permanent = error instanceof PermanentTenantDeliveryError;
    const exhausted = job.attempt_count >= job.max_attempts;
    const nextStatus: TenantOutreachStatus = permanent
      ? 'failed'
      : exhausted
        ? 'dead_letter'
        : 'retrying';
    const delaySeconds = this.retryDelaySeconds(
      retryBaseSeconds,
      job.attempt_count,
      job.id,
    );
    const message = this.message(error).slice(0, 4000);

    await this.databases.withTenantClient(databaseName, async (client) => {
      await client.query('BEGIN');
      try {
        const updated = await client.query<TenantOutreachJob>(
          `UPDATE tenant_outreach_job
           SET status = $3::text,
               next_attempt_at = CASE
                 WHEN $3::text = 'retrying' THEN now() + ($4::int * interval '1 second')
                 ELSE next_attempt_at
               END,
               last_error = $5::text,
               completed_at = CASE WHEN $3::text IN ('failed', 'dead_letter') THEN now() ELSE NULL END,
               locked_at = NULL,
               locked_by = NULL,
               updated_at = now()
           WHERE id = $1 AND status = 'processing' AND locked_by = $2
           RETURNING *`,
          [job.id, this.workerId, nextStatus, delaySeconds, message],
        );
        if (updated.rows[0]) {
          await this.recordEvent(
            client,
            job.id,
            'processing',
            nextStatus,
            updated.rows[0].attempt_count,
            message,
            nextStatus === 'retrying' ? { retryInSeconds: delaySeconds } : {},
          );
        }
        await client.query('COMMIT');
      } catch (transactionError) {
        await client.query('ROLLBACK');
        throw transactionError;
      }
    });
  }

  private async recoverAbandoned(databaseName: string) {
    const timeoutMinutes = this.clamp(
      process.env.TENANT_JOB_CLAIM_TIMEOUT_MINUTES,
      10,
      2,
      120,
    );
    await this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query<TenantOutreachJob>(
        `UPDATE tenant_outreach_job
         SET status = 'retrying',
             next_attempt_at = now(),
             last_error = CASE
               WHEN last_error = '' THEN 'Recovered an abandoned processing claim.'
               ELSE last_error
             END,
             locked_at = NULL,
             locked_by = NULL,
             updated_at = now()
         WHERE status = 'processing'
           AND locked_at < now() - ($1 * interval '1 minute')
         RETURNING *`,
        [timeoutMinutes],
      );
      for (const job of result.rows) {
        await this.recordEvent(
          client,
          job.id,
          'processing',
          'retrying',
          job.attempt_count,
          'Recovered an abandoned processing claim.',
        );
      }
    });
  }

  private async retrySettings(databaseName: string) {
    return this.databases.withTenantClient(databaseName, async (client) => {
      const result = await client.query(
        "SELECT value FROM tenant_setting WHERE key = 'outreach_scheduling'",
      );
      const value = result.rows[0]?.value ?? {};
      return {
        retryBaseSeconds: this.clamp(value?.retryBaseSeconds, 60, 15, 86_400),
      };
    });
  }

  private retryDelaySeconds(base: number, attempt: number, jobId: number) {
    const exponent = Math.min(8, Math.max(0, attempt - 1));
    const jitter = (jobId * 17 + attempt * 13) % Math.max(1, base);
    return Math.min(86_400, base * 2 ** exponent + jitter);
  }

  private recordEvent(
    client: PoolClient,
    jobId: number,
    fromStatus: string | null,
    toStatus: string,
    attempt: number,
    message: string,
    metadata: any = {},
  ) {
    return client.query(
      `INSERT INTO tenant_outreach_event(
        job_id, from_status, to_status, attempt, message, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [jobId, fromStatus, toStatus, attempt, message, JSON.stringify(metadata ?? {})],
    );
  }

  private async withConcurrency<T>(
    items: T[],
    concurrency: number,
    worker: (item: T) => Promise<void>,
  ) {
    let index = 0;
    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (index < items.length) {
        const current = items[index++];
        await worker(current);
      }
    });
    await Promise.all(runners);
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : `${error ?? 'Unknown tenant delivery error'}`;
  }

  private clamp(value: any, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  }
}
