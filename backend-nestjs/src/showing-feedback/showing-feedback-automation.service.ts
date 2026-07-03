import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { SettingsService } from '../settings/settings.service';
import { ShowingFeedback } from './entities/showing-feedback.entity';
import { ShowingFeedbackQueryService } from './showing-feedback-query.service';

@Injectable()
export class ShowingFeedbackAutomationService {
  private readonly logger = new Logger(ShowingFeedbackAutomationService.name);

  constructor(
    @InjectRepository(ShowingFeedback) private readonly feedbackRepo: Repository<ShowingFeedback>,
    private readonly settings: SettingsService,
    private readonly reports: ShowingFeedbackQueryService,
    private readonly dataSource: DataSource,
  ) {}

  @Cron('*/10 * * * *')
  async processDueReports() {
    const automation = await this.settings.getShowingFeedbackAutomation();
    if (!automation.enabled) return;
    const rows = await this.feedbackRepo.createQueryBuilder('feedback')
      .select('feedback.property_id', 'propertyId')
      .addSelect('MIN(feedback.received_at)', 'firstReceivedAt')
      .addSelect('MAX(feedback.id)', 'latestFeedbackId')
      .groupBy('feedback.property_id')
      .getRawMany();
    for (const row of rows) {
      const propertyId = Number(row.propertyId);
      const state = automation.deliveryState?.[String(propertyId)] ?? {};
      if (Number(row.latestFeedbackId) <= Number(state.lastFeedbackId ?? 0)) continue;
      const first = await this.feedbackRepo.findOne({
        where: { propertyId, id: MoreThan(Number(state.lastFeedbackId ?? 0)) },
        order: { id: 'ASC' },
      });
      if (!first || !this.isDue(first.receivedAt, automation.gapDays)) continue;
      await this.processProperty(propertyId);
    }
  }

  private async processProperty(propertyId: number) {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    const lockName = `showing-feedback-auto:${propertyId}`;
    try {
      const [lock] = await runner.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked', [lockName]);
      if (!lock?.locked) return;
      const automation = await this.settings.getShowingFeedbackAutomation();
      if (!automation.enabled) return;
      const state = automation.deliveryState?.[String(propertyId)] ?? {};
      const processingStartedAt = state.processingStartedAt ? new Date(state.processingStartedAt) : null;
      if (processingStartedAt && Date.now() - processingStartedAt.getTime() < 6 * 60 * 60 * 1000) return;
      const feedback = await this.feedbackRepo.find({
        where: { propertyId, id: MoreThan(Number(state.lastFeedbackId ?? 0)) },
        order: { id: 'ASC' },
        take: automation.maxFeedback,
      });
      if (!feedback.length || !this.isDue(feedback[0].receivedAt, automation.gapDays)) return;
      const throughId = feedback[feedback.length - 1].id;
      await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
        ...state,
        processingStartedAt: new Date(),
        processingThroughId: throughId,
      });
      try {
        const result = await this.reports.sendAutomaticReport({
          propertyId,
          afterFeedbackId: Number(state.lastFeedbackId ?? 0),
          maxFeedback: automation.maxFeedback,
          channels: automation.channels,
          templateId: automation.templateId,
          compressWithAi: automation.compressWithAi,
        });
        if (!result) return;
        await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
          lastFeedbackId: result.latestFeedbackId,
          lastSentAt: new Date(),
          lastError: '',
          processingStartedAt: null,
          processingThroughId: 0,
        });
        this.logger.log(`Sent automatic showing feedback report for property ${propertyId} through feedback ${result.latestFeedbackId}.`);
      } catch (error: any) {
        await this.settings.saveShowingFeedbackDeliveryState(propertyId, {
          ...state,
          lastError: error?.message ?? 'Automatic owner report failed.',
          processingStartedAt: null,
          processingThroughId: 0,
        });
        this.logger.warn(`Automatic showing feedback report failed for property ${propertyId}: ${error?.message ?? error}`);
      }
    } finally {
      try { await runner.query('SELECT pg_advisory_unlock(hashtext($1))', [lockName]); }
      finally { await runner.release(); }
    }
  }

  private isDue(receivedAt: Date, gapDays: number) {
    return Date.now() >= new Date(receivedAt).getTime() + Math.max(0, Number(gapDays) || 0) * 86_400_000;
  }
}
