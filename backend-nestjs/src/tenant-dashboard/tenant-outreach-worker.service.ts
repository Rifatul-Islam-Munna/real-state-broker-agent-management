import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantOutreachService } from './tenant-outreach.service';

@Injectable()
export class TenantOutreachWorkerService {
  private readonly logger = new Logger(TenantOutreachWorkerService.name);
  private readonly workerId = `${hostname()}:${process.pid}:${randomUUID().slice(0, 8)}`;
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenants: Repository<SaasTenant>,
    private readonly outreach: TenantOutreachService,
  ) {}

  @Cron('*/10 * * * * *')
  async processFleet() {
    if (
      process.env.TENANT_OUTREACH_WORKER_ENABLED === 'false' ||
      this.running
    ) {
      return;
    }
    this.running = true;
    try {
      await this.runOnce();
    } finally {
      this.running = false;
    }
  }
  async runOnce() {
    const tenantConcurrency = this.int(
      process.env.TENANT_WORKER_TENANT_CONCURRENCY,
      4,
      1,
      16,
    );
    const tenants = (
      await this.tenants.find({
        where: {
          isActive: true,
          isBlocked: false,
          databaseStatus: 'ready',
          provisioningStatus: 'ready',
        },
        order: { id: 'ASC' },
      })
    ).filter(
      (tenant) =>
        Boolean(tenant.databaseName) &&
        (!tenant.subscriptionExpiresAt ||
          tenant.subscriptionExpiresAt.getTime() > Date.now()),
    );
    await this.mapLimit(tenants, tenantConcurrency, async (tenant) => {
      try {
        await this.processTenant(tenant);
      } catch (error) {
        const message = this.errorMessage(error);
        this.logger.error(
          `Tenant ${tenant.id} queue processing failed: ${message}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    });
  }

  private async processTenant(tenant: SaasTenant) {
    await this.outreach.recoverStaleClaims(tenant);
    const batchSize = this.int(
      process.env.TENANT_OUTREACH_BATCH_SIZE,
      25,
      1,
      100,
    );
    const jobs = await this.outreach.claimDueJobs(
      tenant,
      this.workerId,
      batchSize,
    );
    if (!jobs.length) return;
    const deliveryConcurrency = this.int(
      process.env.TENANT_WORKER_DELIVERY_CONCURRENCY,
      3,
      1,
      10,
    );
    await this.mapLimit(jobs, deliveryConcurrency, async (job) => {
      await this.outreach.processClaimedJob(tenant, job);
    });
    this.logger.log(
      `Processed ${jobs.length} tenant outreach job(s) for tenant ${tenant.id}.`,
    );
  }

  private async mapLimit<T>(
    items: T[],
    concurrency: number,
    callback: (item: T) => Promise<void>,
  ) {
    let cursor = 0;
    const workers = Array.from(
      { length: Math.min(Math.max(1, concurrency), items.length) },
      async () => {
        while (cursor < items.length) {
          const item = items[cursor++];
          await callback(item);
        }
      },
    );
    await Promise.all(workers);
  }

  private int(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error
      ? error.message
      : `${error ?? 'Unknown error'}`;
  }
}
