import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { TenantDatabaseService } from '../tenant-database/tenant-database.service';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

const POSITIVE_WORDS = [
  'love',
  'interested',
  'apply',
  'application',
  'offer',
  'move in',
  'ready',
  'perfect',
  'great',
  'yes',
  'liked',
  'beautiful',
  'amazing',
  'nice',
];
const NEGATIVE_WORDS = [
  'not interested',
  'too expensive',
  'small',
  'no',
  'hate',
  'bad',
  'issue',
  'problem',
  'pass',
  'dirty',
  'disappointed',
  'waste',
];

@Injectable()
export class TenantShowingFeedbackAutomationService {
  private readonly logger = new Logger(TenantShowingFeedbackAutomationService.name);
  private running = false;

  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly databases: TenantDatabaseService,
    private readonly settings: TenantWorkspaceSettingsService,
    @Optional() private readonly outreach?: TenantOutreachService,
  ) {}

  @Cron('*/10 * * * *')
  async processAllTenants() {
    if (this.running) return;
    this.running = true;
    try {
      const tenants = await this.tenantRepository.find({
        where: { databaseStatus: 'ready' } as any,
        order: { id: 'ASC' },
      });
      const ready = tenants.filter(
        (tenant) => tenant.databaseName && tenant.isActive && !tenant.isBlocked,
      );
      await this.withConcurrency(
        ready,
        this.clamp(process.env.TENANT_FEEDBACK_TENANT_CONCURRENCY, 3, 1, 10),
        async (tenant) => {
          try {
            await this.processTenant(tenant);
          } catch (error) {
            this.logger.error(
              `Tenant showing feedback automation failed for ${tenant.databaseName}: ${this.message(error)}`,
            );
          }
        },
      );
    } finally {
      this.running = false;
    }
  }

  async processTenant(tenant: SaasTenant) {
    const outreach = this.outreach;
    if (!outreach) return { scanned: 0, sent: 0, classified: 0 };
    const databaseName = tenant.databaseName!;
    const agency: any = await this.settings.getAgencySettings(tenant);
    const automation = agency?.showingFeedbackAutomation ?? {};
    if (automation.enabled !== true) return { scanned: 0, sent: 0, classified: 0 };

    return this.databases.withTenantClient(databaseName, async (client) => {
      const feedbackRows = await client.query(
        `SELECT id, payload
         FROM tenant_legacy_resource
         WHERE resource = 'showing-feedback'
         ORDER BY id ASC`,
      );
      const byProperty = new Map<number, Array<{ id: number; payload: any }>>();
      let classified = 0;
      for (const row of feedbackRows.rows) {
        const payload = this.jsonObject(row.payload);
        const propertyId = Number(payload?.propertyId ?? payload?.property_id);
        if (!Number.isInteger(propertyId) || propertyId <= 0) continue;
        const normalized = this.classifyRecord(payload);
        if (normalized.changed) {
          classified += 1;
          await client.query(
            `UPDATE tenant_legacy_resource
             SET payload = $2::jsonb, updated_at = now()
             WHERE id = $1`,
            [Number(row.id), JSON.stringify(normalized.payload)],
          );
        }
        const list = byProperty.get(propertyId) ?? [];
        list.push({ id: Number(row.id), payload: normalized.payload });
        byProperty.set(propertyId, list);
      }

      // Classification remains active while owner delivery is paused.
      if (automation.deliveryEnabled === false) {
        return { scanned: feedbackRows.rowCount ?? 0, sent: 0, classified };
      }

      const deliveryState = this.object(automation.deliveryState);
      let sent = 0;
      for (const [propertyId, records] of byProperty) {
        try {
          const state = this.object(deliveryState[String(propertyId)]);
          const lastFeedbackId = Number(state.lastFeedbackId ?? 0);
          const fresh = records.filter((record) => record.id > lastFeedbackId);
          if (!fresh.length) continue;
          const template = await this.resolveTemplate(agency, automation.templateId);
          if (!template) continue;
          const property = await this.propertyRow(client, propertyId);
          if (!property) continue;
          const ownerEmail = this.text(property.ownerEmail);
          const ownerPhone = this.text(property.ownerPhone);
          const channels = this.channels(automation.channels).filter((channel) =>
            this.templateHasChannel(template, channel),
          );
          if (!channels.length) continue;
          const selected = this.filterSentiment(fresh, automation.sentimentFilter);
          if (!selected.length) continue;
          const lastId = Math.max(...selected.map((record) => record.id));
          const rendered = this.renderReport(template, selected, property, agency);
          const scheduled = await outreach.enqueue(tenant, {
            sourceType: 'owner-feedback-report',
            sourceId: propertyId,
            channels,
            recipientName: this.text(property.ownerName, property.title),
            recipientEmail: ownerEmail,
            recipientPhone: ownerPhone,
            title: rendered.title,
            body: rendered.body,
            createdBy: `owner-feedback-report:${template.id}`,
            idempotencyKey: `owner-feedback-report:${tenant.id}:${propertyId}:${lastId}`,
            scheduledAt: new Date(),
            payload: {
              templateId: this.text(template.id),
              propertyId,
              sentimentFilter: this.text(automation.sentimentFilter),
              automatic: true,
            },
          });
          const ok = scheduled.some(
            (job: any) => job?.status !== 'failed' && job?.status !== 'dead_letter',
          );
          if (ok) {
            sent += 1;
            deliveryState[String(propertyId)] = {
              ...state,
              lastFeedbackId: lastId,
              lastSentAt: new Date().toISOString(),
              lastError: '',
            };
          }
        } catch (error) {
          this.logger.warn(
            `Showing feedback report failed for tenant ${tenant.id} property ${propertyId}: ${this.message(error)}`,
          );
        }
      }
      if (sent > 0) {
        await this.settings.updateAgencySettings(tenant, {
          showingFeedbackAutomation: {
            ...automation,
            deliveryState,
          },
        });
        this.logger.log(
          `Sent ${sent} showing feedback report(s) for tenant ${tenant.id}.`,
        );
      }
      return { scanned: feedbackRows.rowCount ?? 0, sent, classified };
    });
  }

  /** Fills in a positive/negative/neutral sentiment when the record lacks one. */
  private classifyRecord(payload: any) {
    const current = this.text(payload?.sentiment).toLowerCase();
    if (['positive', 'negative', 'neutral'].includes(current)) {
      return { changed: false, payload };
    }
    const text = `${payload?.feedbackText ?? payload?.feedback ?? ''}`.toLowerCase();
    const positive = POSITIVE_WORDS.filter((word) => text.includes(word)).length;
    const negative = NEGATIVE_WORDS.filter((word) => text.includes(word)).length;
    const sentiment = positive > negative ? 'positive' : negative > positive ? 'negative' : 'neutral';
    return {
      changed: true,
      payload: { ...payload, sentiment },
    };
  }

  private filterSentiment(
    records: Array<{ id: number; payload: any }>,
    filter: unknown,
  ) {
    const mode = this.text(filter).toLowerCase();
    if (mode !== 'negative') return records;
    return records.filter(
      (record) => this.text(record.payload?.sentiment).toLowerCase() === 'negative',
    );
  }

  private async resolveTemplate(agency: any, templateId: unknown) {
    const templates = Array.isArray(agency?.communicationTemplates)
      ? agency.communicationTemplates
      : [];
    return (
      templates.find(
        (item: any) =>
          `${item?.id}` === `${templateId ?? ''}` &&
          item?.isActive !== false &&
          (item?.audience ?? '') === 'OwnerFeedback',
      ) ??
      templates.find(
        (item: any) =>
          item?.isActive !== false &&
          (item?.audience ?? '') === 'OwnerFeedback',
      ) ??
      null
    );
  }

  private async propertyRow(client: any, propertyId: number) {
    const result = await client.query(
      `SELECT title, payload
       FROM tenant_property
       WHERE id = $1`,
      [propertyId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const payload = this.jsonObject(row.payload);
    return {
      title: this.text(row.title),
      ownerName: this.text(payload?.ownerName),
      ownerEmail: this.text(payload?.ownerEmail).toLowerCase(),
      ownerPhone: this.text(payload?.ownerPhone),
      ...(this.object(payload) as Record<string, unknown>),
    };
  }

  private renderReport(template: any, records: any[], property: any, agency: any) {
    const positive = records.filter(
      (record) => this.text(record.payload?.sentiment).toLowerCase() === 'positive',
    );
    const negative = records.filter(
      (record) => this.text(record.payload?.sentiment).toLowerCase() === 'negative',
    );
    const positiveText = positive
      .map((record) => this.text(record.payload?.feedbackText))
      .filter(Boolean)
      .join('\n');
    const negativeText = negative
      .map((record) => this.text(record.payload?.feedbackText))
      .filter(Boolean)
      .join('\n');
    const summary = records
      .map((record) => this.text(record.payload?.feedbackText))
      .filter(Boolean)
      .join('\n');
    const replacements: Record<string, string> = {
      '{{positive_feedback}}': positiveText || 'No positive feedback recorded.',
      '{{negative_feedback}}': negativeText || 'No negative feedback recorded.',
      '{{feedback_summary}}': summary || 'No feedback recorded.',
      '{{positive_summary}}': positiveText
        ? `${positive.length} positive response(s):\n${positiveText}`
        : 'No positive feedback recorded.',
      '{{negative_summary}}': negativeText
        ? `${negative.length} negative response(s):\n${negativeText}`
        : 'No negative feedback recorded.',
      '{{property_address}}': this.text(property.title, 'the property'),
      '{{client_name}}': this.text(property.ownerName, 'Owner'),
      '{{agency_name}}': this.text(agency?.profile?.agencyName, 'our agency'),
    };
    const render = (value: string) =>
      Object.entries(replacements).reduce(
        (current, [token, text]) => current.replaceAll(token, text),
        this.text(value),
      );
    return {
      title: render(this.text(template.subject, 'Showing feedback report')),
      body: render(this.text(template.body, '')),
    };
  }

  private templateHasChannel(template: any, channel: 'Email' | 'SMS') {
    if (!template) return false;
    const channels = Array.isArray(template.channels)
      ? template.channels.map((item: any) => `${item}`.toLowerCase())
      : [];
    return channels.includes(channel.toLowerCase());
  }

  private channels(value: unknown): Array<'Email' | 'SMS'> {
    const values = Array.isArray(value) ? value : [];
    const channels = values
      .map((item) => `${item}`.toLowerCase())
      .filter((item) => item === 'email' || item === 'sms')
      .map((item) => (item === 'email' ? 'Email' : 'SMS'));
    return [...new Set(channels)] as Array<'Email' | 'SMS'>;
  }

  private jsonObject(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private object(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? { ...value }
      : {};
  }

  private text(value: any, fallback = '') {
    const result = `${value ?? ''}`.trim();
    return result || `${fallback ?? ''}`.trim();
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : `${error ?? 'Unknown error'}`;
  }

  private clamp(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed)
      ? Math.min(max, Math.max(min, parsed))
      : fallback;
  }

  private async withConcurrency<T>(
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
}
