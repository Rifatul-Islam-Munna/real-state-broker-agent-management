import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { dateRangeInZone } from '../common/time-zone';
import { Property } from '../properties/entities/property.entity';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { SmsService } from '../sms/sms.service';
import { ShowingFeedback } from './entities/showing-feedback.entity';

@Injectable()
export class ShowingFeedbackQueryService {
  constructor(
    @InjectRepository(ShowingFeedback)
    private readonly feedbackRepo: Repository<ShowingFeedback>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    private readonly settingsService: SettingsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
    @Inject(forwardRef(() => SmsService))
    private readonly smsService: SmsService,
  ) {}

  async propertySummary() {
    const rows = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .innerJoin('feedback.property', 'property')
      .select('feedback.property_id', 'propertyId')
      .addSelect('property.title', 'propertyTitle')
      .addSelect('property.location', 'propertyLocation')
      .addSelect('COUNT(feedback.id)', 'feedbackCount')
      .addSelect(
        "SUM(CASE WHEN feedback.sentiment = 'positive' THEN 1 ELSE 0 END)",
        'positiveCount',
      )
      .addSelect(
        "SUM(CASE WHEN feedback.sentiment = 'negative' THEN 1 ELSE 0 END)",
        'negativeCount',
      )
      .addSelect(
        "SUM(CASE WHEN feedback.sentiment = 'neutral' THEN 1 ELSE 0 END)",
        'neutralCount',
      )
      .addSelect('MAX(feedback.received_at)', 'latestFeedbackAt')
      .groupBy('feedback.property_id')
      .addGroupBy('property.title')
      .addGroupBy('property.location')
      .orderBy('MAX(feedback.received_at)', 'DESC')
      .getRawMany();

    return rows.map((row) => ({
      propertyId: Number(row.propertyId),
      propertyTitle: row.propertyTitle,
      propertyLocation: row.propertyLocation,
      feedbackCount: Number(row.feedbackCount),
      positiveCount: Number(row.positiveCount),
      negativeCount: Number(row.negativeCount),
      neutralCount: Number(row.neutralCount),
      latestFeedbackAt: row.latestFeedbackAt,
    }));
  }

  async findAll(
    propertyId: number,
    page = 1,
    pageSize = 10,
    fromDate?: string,
    toDate?: string,
    sentiment?: string,
    readStatus?: string,
    leadOnly?: boolean,
  ) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.property_id = :propertyId', { propertyId });

    if (fromDate && toDate) {
      const range = dateRangeInZone(
        fromDate,
        toDate,
        await this.schedulingSettingsService.getTimeZone(),
      );
      if (!range)
        throw new BadRequestException('Feedback date range is invalid.');
      qb.andWhere('feedback.received_at >= :start', {
        start: range.start,
      }).andWhere('feedback.received_at < :endExclusive', {
        endExclusive: range.endExclusive,
      });
    }

    const normalizedSentiment = `${sentiment ?? ''}`.trim().toLowerCase();
    if (['positive', 'negative', 'neutral'].includes(normalizedSentiment)) {
      qb.andWhere('feedback.sentiment = :sentiment', {
        sentiment: normalizedSentiment,
      });
    }

    if (readStatus === 'read') qb.andWhere('feedback.is_read = true');
    if (readStatus === 'unread') qb.andWhere('feedback.is_read = false');
    if (leadOnly) qb.andWhere('feedback.lead_id IS NOT NULL');

    const [items, totalCount] = await qb
      .orderBy('feedback.priorityScore', 'DESC')
      .addOrderBy('feedback.receivedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      hasNextPage: page * pageSize < totalCount,
      hasPreviousPage: page > 1,
    };
  }


  async markRead(id: number, isRead = true) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Showing feedback not found.');
    feedback.isRead = isRead;
    return this.feedbackRepo.save(feedback);
  }

  async leadInbox(
    fromDate?: string,
    toDate?: string,
    readStatus?: string,
    page = 1,
    pageSize = 25,
    sentiment?: string,
    intent?: string,
    minimumPriority = 0,
  ) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
    const qb = this.feedbackRepo.createQueryBuilder('feedback').where('feedback.lead_id IS NOT NULL');
    if (fromDate && toDate) {
      const range = dateRangeInZone(fromDate, toDate, await this.schedulingSettingsService.getTimeZone());
      if (!range) throw new BadRequestException('Feedback date range is invalid.');
      qb.andWhere('feedback.received_at >= :start', { start: range.start }).andWhere('feedback.received_at < :end', { end: range.endExclusive });
    }
    if (readStatus === 'read') qb.andWhere('feedback.is_read = true');
    if (readStatus === 'unread') qb.andWhere('feedback.is_read = false');
    if (['positive', 'neutral', 'negative'].includes(`${sentiment ?? ''}`)) qb.andWhere('feedback.sentiment = :sentiment', { sentiment });
    if (['apply', 'offer', 'interested', 'not_interested', 'unknown'].includes(`${intent ?? ''}`)) qb.andWhere('feedback.intent = :intent', { intent });
    if (minimumPriority > 0) qb.andWhere('feedback.priorityScore >= :minimumPriority', { minimumPriority });
    const [items, totalCount] = await qb
      .distinct(true)
      .leftJoinAndSelect('feedback.realtorShowing', 'showing')
      .leftJoinAndSelect('showing.lead', 'lead')
      .leftJoinAndSelect('feedback.property', 'property')
      .orderBy('feedback.priorityScore', 'DESC')
      .addOrderBy('feedback.receivedAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      hasNextPage: page * pageSize < totalCount,
      hasPreviousPage: page > 1,
    };
  }

  async bulkMarkRead(ids: number[], isRead = true) {
    const cleanIds = Array.from(new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))).slice(0, 500);
    if (!cleanIds.length) throw new BadRequestException('Select at least one feedback item.');
    await this.feedbackRepo.createQueryBuilder().update().set({ isRead }).whereInIds(cleanIds).execute();
    return { updatedCount: cleanIds.length, isRead };
  }

  async reclassify(id: number, input: { sentiment?: string; intent?: string; priorityScore?: number; applyLikelihood?: number }) {
    const feedback = await this.feedbackRepo.findOne({ where: { id } });
    if (!feedback) throw new NotFoundException('Showing feedback not found.');
    if (['positive', 'neutral', 'negative'].includes(`${input.sentiment}`)) feedback.sentiment = `${input.sentiment}`;
    if (['apply', 'offer', 'interested', 'not_interested', 'unknown'].includes(`${input.intent}`)) feedback.intent = `${input.intent}`;
    if (Number.isFinite(Number(input.priorityScore))) feedback.priorityScore = Math.max(0, Math.min(100, Number(input.priorityScore)));
    if (Number.isFinite(Number(input.applyLikelihood))) feedback.applyLikelihood = Math.max(0, Math.min(1, Number(input.applyLikelihood)));
    feedback.classifier = 'Human reviewed';
    feedback.confidence = 1;
    return this.feedbackRepo.save(feedback);
  }

  async previewReport(payload: any) {
    return this.renderReport(
      await this.reportContext(payload),
      payload?.summarize === true,
    );
  }

  async sendReport(payload: any) {
    const context = await this.reportContext(payload);
    return this.deliver(
      context,
      payload?.channels,
      payload?.summarize === true,
      'Showing Feedback',
    );
  }

  async sendAutomaticReport(payload: any) {
    const propertyId = Number(payload?.propertyId);
    const afterFeedbackId = Math.max(0, Number(payload?.afterFeedbackId) || 0);
    const maxFeedback = Math.min(
      50,
      Math.max(1, Number(payload?.maxFeedback) || 10),
    );
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const automation =
      await this.settingsService.getShowingFeedbackAutomation();
    const zone = await this.schedulingSettingsService.getTimeZone();
    const localDate = this.dateKey(new Date(), zone);
    if (this.weekday(localDate) !== this.reportDay(automation.gapDays))
      return null;
    const state = automation.deliveryState?.[String(propertyId)] ?? {};
    if (this.wasSentThisWeek(state.lastSentAt, this.weekKey(localDate), zone))
      return null;

    const feedback = await this.feedbackRepo.find({
      where: {
        propertyId,
        id: MoreThan(afterFeedbackId),
        sentiment: In(['positive', 'negative']),
      },
      order: { id: 'ASC' },
      take: maxFeedback,
    });
    if (!feedback.length) return null;

    const settings = await this.settingsService.getAdminSettings();
    const template = (settings.communicationTemplates ?? []).find(
      (item: any) =>
        item.id === payload?.templateId &&
        item.audience === 'OwnerFeedback' &&
        item.isActive !== false,
    );
    if (!template)
      throw new BadRequestException(
        'Automatic owner feedback template is missing or paused.',
      );

    const fromDate = this.dateKey(feedback[0].receivedAt, zone);
    const toDate = this.dateKey(feedback[feedback.length - 1].receivedAt, zone);
    const result = await this.deliver(
      { property, feedback, fromDate, toDate, template },
      payload?.channels,
      payload?.compressWithAi === true,
      'Automatic Showing Feedback',
    );

    return {
      ...result,
      firstFeedbackId: feedback[0].id,
      latestFeedbackId: feedback[feedback.length - 1].id,
    };
  }

  private async deliver(
    context: any,
    rawChannels: any,
    summarize: boolean,
    actor: string,
  ) {
    const rendered = await this.renderReport(context, summarize);
    const channels = Array.isArray(rawChannels) ? rawChannels : [];
    const wantsEmail = channels.includes('Email');
    const wantsSms = channels.includes('Sms') || channels.includes('SMS');
    if (!wantsEmail && !wantsSms)
      throw new BadRequestException('Choose Email, SMS, or both.');

    const sent: string[] = [];
    if (wantsEmail) {
      if (!context.property.ownerEmail)
        throw new BadRequestException('Property owner email is missing.');
      await this.sendEmail(
        context.property.ownerEmail,
        rendered.subject,
        rendered.body,
      );
      sent.push('Email');
    }
    if (wantsSms) {
      if (!context.property.ownerPhone)
        throw new BadRequestException('Property owner phone is missing.');
      const result = await this.smsService.send(
        { body: rendered.body, to: context.property.ownerPhone },
        actor,
      );
      if (result.status === 'Failed')
        throw new BadRequestException('Owner SMS failed.');
      sent.push('SMS');
    }
    return { ...rendered, sent };
  }

  private async reportContext(payload: any) {
    const propertyId = Number(payload?.propertyId);
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });
    if (!property) throw new NotFoundException('Property not found.');

    const fromDate = `${payload?.fromDate ?? ''}`.trim();
    const toDate = `${payload?.toDate ?? ''}`.trim();
    const range = dateRangeInZone(
      fromDate,
      toDate,
      await this.schedulingSettingsService.getTimeZone(),
    );
    if (!range)
      throw new BadRequestException('Choose a valid from and to date.');

    const maxFeedback = Math.min(
      50,
      Math.max(1, Number(payload?.maxFeedback) || 10),
    );
    const feedback = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.property_id = :propertyId', { propertyId })
      .andWhere('feedback.sentiment IN (:...sentiments)', {
        sentiments: ['positive', 'negative'],
      })
      .andWhere('feedback.received_at >= :start', { start: range.start })
      .andWhere('feedback.received_at < :endExclusive', {
        endExclusive: range.endExclusive,
      })
      .orderBy('feedback.received_at', 'ASC')
      .take(maxFeedback)
      .getMany();
    if (!feedback.length) {
      throw new BadRequestException(
        'No positive or negative feedback found in selected date range.',
      );
    }

    const settings = await this.settingsService.getAdminSettings();
    const template = (settings.communicationTemplates ?? []).find(
      (item: any) =>
        item.id === payload?.templateId &&
        item.audience === 'OwnerFeedback' &&
        item.isActive !== false,
    );
    if (!template)
      throw new BadRequestException(
        'Choose an active owner feedback template.',
      );
    return { property, feedback, fromDate, toDate, template };
  }

  private async renderReport(context: any, summarize: boolean) {
    const positive = context.feedback.filter(
      (item: ShowingFeedback) => item.sentiment === 'positive',
    );
    const negative = context.feedback.filter(
      (item: ShowingFeedback) => item.sentiment === 'negative',
    );
    const [positiveSummary, negativeSummary] = summarize
      ? await Promise.all([
          this.summarizeFeedback(
            positive.map((item: ShowingFeedback) => item.feedbackText),
            'positive',
          ),
          this.summarizeFeedback(
            negative.map((item: ShowingFeedback) => item.feedbackText),
            'negative',
          ),
        ])
      : ['', ''];

    const conciseSummary = [
      positiveSummary ? `Positive: ${positiveSummary}` : '',
      negativeSummary ? `Negative: ${negativeSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    const positiveList = this.feedbackList(
      positive,
      'No positive feedback was received.',
    );
    const negativeList = this.feedbackList(
      negative,
      'No negative feedback was received.',
    );
    const templateText = `${context.template.subject ?? ''}\n${context.template.body ?? ''}`;
    const hasSeparatedTokens =
      /\{\{(?:positive|negative)_(?:feedback|summary)\}\}/.test(templateText);
    const legacySeparatedBlock = [
      conciseSummary ? `Summary\n${conciseSummary}` : '',
      `Positive feedback\n${positiveList}`,
      `Negative feedback\n${negativeList}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    const usesLegacySummaryBlock =
      !hasSeparatedTokens && templateText.includes('{{feedback_summary}}');

    const replacements: Record<string, string> = {
      '{{property_address}}': context.property.title,
      '{{fromdate}}': context.fromDate,
      '{{todate}}': context.toDate,
      '{{feedback_summary}}': usesLegacySummaryBlock
        ? legacySeparatedBlock
        : conciseSummary,
      '{{positive_summary}}': positiveSummary,
      '{{negative_summary}}': negativeSummary,
      '{{positive_feedback}}': positiveList,
      '{{negative_feedback}}': negativeList,
    };
    context.feedback.forEach((item: ShowingFeedback, index: number) => {
      replacements[`{{feedback${index + 1}}}`] = usesLegacySummaryBlock
        ? ''
        : `${index + 1}. [${this.sentimentLabel(item.sentiment)}] ${item.feedbackText}`;
    });

    const render = (text: string) => {
      let output = `${text ?? ''}`;
      for (const [token, value] of Object.entries(replacements)) {
        output = output.replaceAll(token, value);
      }
      return output
        .replace(/\{\{feedback\d+\}\}/g, '')
        .replace(/\{\{feedback_summary\}\}/g, '')
        .replace(/\{\{positive_(?:feedback|summary)\}\}/g, '')
        .replace(/\{\{negative_(?:feedback|summary)\}\}/g, '')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };

    return {
      body: render(context.template.body),
      feedbackCount: context.feedback.length,
      positiveCount: positive.length,
      negativeCount: negative.length,
      subject: render(context.template.subject),
      summarized: summarize,
    };
  }

  private feedbackList(feedback: ShowingFeedback[], emptyText: string) {
    if (!feedback.length) return emptyText;
    return feedback
      .map((item, index) => `${index + 1}. ${item.feedbackText}`)
      .join('\n');
  }

  private async summarizeFeedback(
    feedback: string[],
    sentiment: 'positive' | 'negative',
  ) {
    if (!feedback.length) return '';
    const fallback = feedback
      .slice(0, 5)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .join(' ')
      .slice(0, 700);
    const config = await this.settingsService.getAiProviderConfig();
    const provider = `${config?.providerName ?? ''}`.toLowerCase();
    if (!config?.model || (!config?.apiKey && provider !== 'ollama'))
      return fallback;

    try {
      const parsed = await this.callAiJson(config, [
        {
          role: 'system',
          content: `Summarize only the ${sentiment} property showing feedback in 1 to 4 concise owner-facing lines. Do not invent details. Return JSON only with summary string.`,
        },
        { role: 'user', content: JSON.stringify(feedback) },
      ]);
      return `${parsed?.summary ?? fallback}`.trim();
    } catch {
      return fallback;
    }
  }

  private async callAiJson(config: any, messages: any[]) {
    const provider = `${config.providerName ?? 'OpenAI'}`.toLowerCase();
    const base =
      `${config.baseUrl ?? (provider.includes('openai') ? 'https://api.openai.com/v1' : '')}`.replace(
        /\/+$/,
        '',
      );
    if (!base) throw new Error('AI base URL missing.');

    if (provider === 'ollama') {
      const response = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          format: 'json',
          stream: false,
        }),
      });
      if (!response.ok) throw new Error('Ollama request failed.');
      const data: any = await response.json();
      return JSON.parse(data?.message?.content ?? '{}');
    }

    const response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: config.model,
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
    });
    if (!response.ok) throw new Error('AI request failed.');
    const data: any = await response.json();
    return JSON.parse(data?.choices?.[0]?.message?.content ?? '{}');
  }

  private async sendEmail(to: string, subject: string, body: string) {
    const config = await this.settingsService.getSmtpConfig();
    if (!config?.host || !config?.username || !config?.password) {
      throw new BadRequestException('SMTP mail is not configured.');
    }
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port ?? 587,
      secure: !!config.useSsl && Number(config.port ?? 587) === 465,
      auth: { user: config.username, pass: config.password },
    });
    await transporter.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${config.fromEmail || config.username}>`
        : config.fromEmail || config.username,
      html: body.replace(/\n/g, '<br>'),
      subject,
      text: body,
      to,
    });
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

  private sentimentLabel(value: string) {
    return value === 'negative'
      ? 'Negative'
      : value === 'positive'
        ? 'Positive'
        : 'Neutral';
  }
}
