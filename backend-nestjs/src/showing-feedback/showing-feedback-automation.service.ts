import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, MoreThan, Repository } from 'typeorm';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { ShowingFeedback } from './entities/showing-feedback.entity';
import { ShowingFeedbackQueryService } from './showing-feedback-query.service';

@Injectable()
export class ShowingFeedbackAutomationService {
  private readonly logger = new Logger(ShowingFeedbackAutomationService.name);

  constructor(
    @InjectRepository(ShowingFeedback)
    private readonly feedbackRepo: Repository<ShowingFeedback>,
    private readonly settings: SettingsService,
    private readonly reports: ShowingFeedbackQueryService,
    private readonly dataSource: DataSource,
    private readonly scheduling: SchedulingSettingsService,
  ) {}

  @Cron('*/10 * * * *')
  async processDueReports() {
    const automation = await this.settings.getShowingFeedbackAutomation();
    if (!automation.enabled) return;

    const zone = await this.scheduling.getTimeZone();
    const localDate = this.dateKey(new Date(), zone);
    const currentWeekKey = this.weekKey(localDate);
    if (this.weekday(localDate) !== this.reportDay(automation.gapDays)) return;

    const rows = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .select('feedback.property_id', 'propertyId')
      .addSelect('MAX(feedback.id)', 'latestFeedbackId')
      .where('feedback.sentiment IN (:...sentiments)', {
        sentiments: ['positive', 'negative'],
      })
      .groupBy('feedback.property_id')
      .getRawMany();

    for (const row of rows) {
      const propertyId = Number(row.propertyId);
      const state = automation.deliveryState?.[String(propertyId)] ?? {};
      if (Number(row.latestFeedbackId) <= Number(state.lastFeedbackId ?? 0)) {
        continue;
      }
      if (this.wasSentThisWeek(state.lastSentAt, currentWeekKey, zone)) {
        continue;
      }
      await this.processProperty(propertyId, currentWeekKey, zone);
    }
  }

  private async processProperty(
    propertyId: number,
    currentWeekKey: string,
    zone: string,
  ) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    const lockName = `showing-feedback-auto:${propertyId}`;

    try {
      const [lock] = await runner.query(
        'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
        [lockName],
      );
      if (!lock?.locked) return;

      const automation = await this.settings.getShowingFeedbackAutomation();
      if (!automation.enabled) return;
      const localDate = this.dateKey(new Date(), zone);
      if (this.weekday(localDate) !== this.reportDay(automation.gapDays)) return;

      const state = automation.deliveryState?.[String(propertyId)] ?? {};
      if (this.wasSentThisWeek(state.lastSentAt, currentWeekKey, zone)) return;

      const processingStartedAt = state.processingStartedAt
        ? new Date(state.processingStartedAt)
        : null;
      if (
        processingStartedAt &&
        Date.now() - processingStartedAt.getTime() < 6 * 60 * 60 * 1000
      ) {
        return;
      }

      const feedback = await this.feedbackRepo.find({
        where: {
          propertyId,
          id: MoreThan(Number(state.lastFeedbackId ?? 0)),
          sentiment: In(['positive', 'negative']),
        },
        order: { id: 'ASC' },
        take: automation.maxFeedback,
      });
      if (!feedback.length) return;

      await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
        ...state,
        processingStartedAt: new Date(),
        processingThroughId: feedback[feedback.length - 1].id,
      });

      try {
        const templateIds = await this.reportTemplateIds(automation.templateId);
        let latestFeedbackId = feedback[feedback.length - 1].id;

        for (const templateId of templateIds) {
          const result = await this.reports.sendAutomaticReport({
            propertyId,
            afterFeedbackId: Number(state.lastFeedbackId ?? 0),
            maxFeedback: automation.maxFeedback,
            channels: automation.channels,
            templateId,
            compressWithAi: automation.compressWithAi,
          });
          if (!result) {
            await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
              ...state,
              processingStartedAt: null,
              processingThroughId: 0,
            });
            return;
          }
          latestFeedbackId = Math.max(
            latestFeedbackId,
            Number(result.latestFeedbackId) || latestFeedbackId,
          );
        }

        await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
          lastFeedbackId: latestFeedbackId,
          lastSentAt: new Date(),
          lastError: '',
          processingStartedAt: null,
          processingThroughId: 0,
        });
        this.logger.log(
          `Sent ${templateIds.length} weekly showing feedback template(s) for property ${propertyId} through feedback ${latestFeedbackId}.`,
        );
      } catch (error: any) {
        await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
          ...state,
          lastError: error?.message ?? 'Weekly owner report failed.',
          processingStartedAt: null,
          processingThroughId: 0,
        });
        this.logger.warn(
          `Weekly showing feedback report failed for property ${propertyId}: ${error?.message ?? error}`,
        );
      }
    } finally {
      try {
        await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [
          lockName,
        ]);
      } finally {
        await runner.release();
      }
    }
  }

  private async reportTemplateIds(primaryTemplateId: string) {
    const settings = await this.settings.getAdminSettings();
    const sequenceRank: Record<string, number> = {
      FollowUp1: 1,
      FollowUp2: 2,
      FollowUp3: 3,
    };
    const followUps = (settings.communicationTemplates ?? [])
      .filter(
        (template: any) =>
          template.audience === 'OwnerFeedback' &&
          template.isActive !== false &&
          template.id !== primaryTemplateId &&
          sequenceRank[template.sequenceType] !== undefined,
      )
      .sort((left: any, right: any) => {
        const rank = sequenceRank[left.sequenceType] - sequenceRank[right.sequenceType];
        if (rank !== 0) return rank;
        return Number(left.gapDays ?? 0) - Number(right.gapDays ?? 0);
      })
      .map((template: any) => `${template.id ?? ''}`.trim())
      .filter(Boolean);

    return Array.from(new Set([primaryTemplateId, ...followUps].filter(Boolean)));
  }

  private reportDay(value: unknown) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    return Number.isFinite(parsed) ? Math.min(6, Math.max(0, parsed)) : 1;
  }

  private weekday(dateKey: string) {
    return new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  }

  private wasSentThisWeek(
    value: unknown,
    currentWeekKey: string,
    zone: string,
  ) {
    if (!value) return false;
    const sentAt = new Date(`${value}`);
    if (Number.isNaN(sentAt.getTime())) return false;
    return this.weekKey(this.dateKey(sentAt, zone)) === currentWeekKey;
  }

  private weekKey(dateKey: string) {
    const date = new Date(`${dateKey}T12:00:00Z`);
    const mondayOffset = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - mondayOffset);
    return date.toISOString().slice(0, 10);
  }

  private dateKey(value: Date, timeZone: string) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  }
}
