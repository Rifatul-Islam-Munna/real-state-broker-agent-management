import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Between, Repository } from 'typeorm';
import { parseDateTimeInZone } from '../common/time-zone';
import { SmsService } from '../sms/sms.service';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { SettingsService } from '../settings/settings.service';
import { Property } from '../properties/entities/property.entity';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { LeadHistoryEntry, leadHistoryStatusDb } from '../leads/entities/lead-history.entity';
import { ShowingFeedback } from './entities/showing-feedback.entity';

type InboundFeedbackInput = {
  leadId: number;
  channel: 'Email' | 'Sms';
  sourceMessageId: string;
  subject?: string;
  message: string;
  receivedAt: Date;
  realtorContact: string;
};

type FeedbackImportMapping = {
  property?: string;
  realtorName?: string;
  realtorContact?: string;
  realtorEmail?: string;
  realtorPhone?: string;
  channel?: string;
  feedbackText?: string;
  sentiment?: string;
  showingAt?: string;
  firstMessageAt?: string;
  receivedAt?: string;
};

@Injectable()
export class ShowingFeedbackService {
  constructor(
    @InjectRepository(ShowingFeedback)
    private readonly feedbackRepo: Repository<ShowingFeedback>,
    @InjectRepository(RealtorShowing)
    private readonly showingRepo: Repository<RealtorShowing>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    @InjectRepository(LeadHistoryEntry)
    private readonly historyRepo: Repository<LeadHistoryEntry>,
    private readonly settingsService: SettingsService,
    private readonly schedulingSettingsService: SchedulingSettingsService,
    @Inject(forwardRef(() => SmsService))
    private readonly smsService: SmsService,
  ) {}

  async processInbound(input: InboundFeedbackInput) {
    if (!input.leadId || !input.message.trim() || !input.sourceMessageId) return null;
    const duplicate = await this.feedbackRepo.findOne({
      where: { channel: input.channel, sourceMessageId: input.sourceMessageId },
    });
    if (duplicate) return duplicate;

    const showings = await this.showingRepo.find({
      where: { leadId: input.leadId },
      order: { createdAt: 'DESC' },
      relations: ['property'],
    });
    for (const showing of showings) {
      if (!showing.propertyId) continue;
      const firstMessage = await this.historyRepo
        .createQueryBuilder('history')
        .where('history.lead_id = :leadId', { leadId: input.leadId })
        .andWhere('history.created_by = :createdBy', {
          createdBy: `Realtor Showing #${showing.id}`,
        })
        .andWhere('history.status IN (:...statuses)', {
          statuses: ['Sent', 'Completed'].map(leadHistoryStatusDb),
        })
        .andWhere('history.occurred_at <= :receivedAt', {
          receivedAt: input.receivedAt,
        })
        .orderBy('history.occurred_at', 'ASC')
        .getOne();
      if (!firstMessage) continue;

      const classification = await this.classifyFeedback(
        input.subject ?? '',
        input.message,
      );
      if (!classification.isFeedback) return null;
      return this.feedbackRepo.save(
        this.feedbackRepo.create({
          channel: input.channel,
          classifier: classification.classifier,
          confidence: classification.confidence,
          feedbackText: classification.feedbackText || input.message.trim(),
          firstMessageAt: firstMessage.occurredAt ?? firstMessage.createdAt,
          leadId: input.leadId,
          propertyId: showing.propertyId,
          realtorContact: input.realtorContact,
          realtorName: showing.realtorName,
          realtorShowingId: showing.id,
          receivedAt: input.receivedAt,
          sentiment: classification.sentiment,
          sourceMessageId: input.sourceMessageId,
        }),
      );
    }
    return null;
  }

  async createManual(payload: any) {
    const [properties, timeZone] = await Promise.all([
      this.propertyRepo.find(),
      this.schedulingSettingsService.getTimeZone(),
    ]);

    return this.createFeedbackRecord(payload, properties, timeZone, 'manual');
  }

  async importRows(payload: any) {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (rows.length === 0) throw new BadRequestException('CSV has no data rows.');

    const mapping: FeedbackImportMapping = payload?.mapping ?? {};
    if (!mapping.property) throw new BadRequestException('Map the property column.');
    if (!mapping.feedbackText) throw new BadRequestException('Map the feedback column.');
    if (!mapping.firstMessageAt && !mapping.showingAt) {
      throw new BadRequestException('Map the first message or showing date/time column.');
    }

    const [properties, timeZone] = await Promise.all([
      this.propertyRepo.find(),
      this.schedulingSettingsService.getTimeZone(),
    ]);
    const failures: string[] = [];
    let createdCount = 0;

    for (let index = 0; index < rows.length; index++) {
      try {
        const source = this.cleanRecord(rows[index]);
        await this.createFeedbackRecord(
          {
            channel: this.value(source, mapping.channel),
            feedbackText: this.value(source, mapping.feedbackText),
            firstMessageAt:
              this.value(source, mapping.firstMessageAt) ||
              this.value(source, mapping.showingAt),
            property: this.value(source, mapping.property),
            realtorContact: this.value(source, mapping.realtorContact),
            realtorEmail: this.value(source, mapping.realtorEmail),
            realtorName: this.value(source, mapping.realtorName),
            realtorPhone: this.value(source, mapping.realtorPhone),
            receivedAt: this.value(source, mapping.receivedAt),
            sentiment: this.value(source, mapping.sentiment),
            showingAt: this.value(source, mapping.showingAt),
            sourceData: source,
          },
          properties,
          timeZone,
          'csv',
        );
        createdCount++;
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }

    return {
      createdCount,
      failedCount: failures.length,
      failures,
    };
  }

  async propertySummary() {
    const rows = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .innerJoin('feedback.property', 'property')
      .select('feedback.property_id', 'propertyId')
      .addSelect('property.title', 'propertyTitle')
      .addSelect('property.location', 'propertyLocation')
      .addSelect('COUNT(feedback.id)', 'feedbackCount')
      .addSelect('MAX(feedback.first_message_at)', 'latestFeedbackAt')
      .groupBy('feedback.property_id')
      .addGroupBy('property.title')
      .addGroupBy('property.location')
      .orderBy('MAX(feedback.first_message_at)', 'DESC')
      .getRawMany();
    return rows.map((row) => ({
      propertyId: Number(row.propertyId),
      propertyTitle: row.propertyTitle,
      propertyLocation: row.propertyLocation,
      feedbackCount: Number(row.feedbackCount),
      latestFeedbackAt: row.latestFeedbackAt,
    }));
  }

  async findAll(
    propertyId: number,
    page = 1,
    pageSize = 10,
    fromDate?: string,
    toDate?: string,
  ) {
    page = Math.max(1, Number(page) || 1);
    pageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
    const qb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.property_id = :propertyId', { propertyId });
    if (fromDate) {
      qb.andWhere('feedback.first_message_at >= :fromDate', {
        fromDate: new Date(`${fromDate}T00:00:00Z`),
      });
    }
    if (toDate) {
      qb.andWhere('feedback.first_message_at <= :toDate', {
        toDate: new Date(`${toDate}T23:59:59.999Z`),
      });
    }
    const [items, totalCount] = await qb
      .orderBy('feedback.first_message_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
    return {
      items,
      page,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  }

  async previewReport(payload: any) {
    const context = await this.reportContext(payload);
    return this.renderReport(context, !!payload.summarize);
  }

  async sendReport(payload: any) {
    const context = await this.reportContext(payload);
    const rendered = await this.renderReport(context, !!payload.summarize);
    const channels = Array.isArray(payload.channels) ? payload.channels : [];
    if (!channels.includes('Email') && !channels.includes('Sms')) {
      throw new BadRequestException('Choose Email, SMS, or both.');
    }
    const sent: string[] = [];
    if (channels.includes('Email')) {
      if (!context.property.ownerEmail) {
        throw new BadRequestException('Property owner email is missing.');
      }
      await this.sendEmail(
        context.property.ownerEmail,
        rendered.subject,
        rendered.body,
      );
      sent.push('Email');
    }
    if (channels.includes('Sms')) {
      if (!context.property.ownerPhone) {
        throw new BadRequestException('Property owner phone is missing.');
      }
      const result = await this.smsService.send(
        {
          body: rendered.body,
          to: context.property.ownerPhone,
        },
        'Showing Feedback',
      );
      if (result.status === 'Failed') {
        throw new BadRequestException('Owner SMS failed.');
      }
      sent.push('SMS');
    }
    return { ...rendered, sent };
  }

  private async createFeedbackRecord(
    payload: any,
    properties: Property[],
    timeZone: string,
    source: 'csv' | 'manual',
  ) {
    const property = this.resolveProperty(payload, properties);
    if (!property) throw new BadRequestException('Property could not be matched.');

    const feedbackText = `${payload?.feedbackText ?? ''}`.trim();
    if (!feedbackText) throw new BadRequestException('Feedback text is required.');

    const firstMessageAt = parseDateTimeInZone(
      payload?.firstMessageAt || payload?.showingAt,
      timeZone,
    );
    if (!firstMessageAt) {
      throw new BadRequestException('A valid feedback date and time is required.');
    }
    const showingAt =
      parseDateTimeInZone(payload?.showingAt, timeZone) ?? firstMessageAt;
    const receivedAt =
      parseDateTimeInZone(payload?.receivedAt, timeZone) ?? firstMessageAt;
    const realtorName = `${payload?.realtorName ?? ''}`.trim() || 'Realtor';
    const realtorEmail = `${payload?.realtorEmail ?? ''}`.trim().toLowerCase();
    const realtorPhone = `${payload?.realtorPhone ?? ''}`.trim();
    const realtorContact =
      `${payload?.realtorContact ?? ''}`.trim() || realtorEmail || realtorPhone;
    const channel = this.normalizeChannel(payload?.channel, realtorEmail);
    const sentiment = this.normalizeSentiment(payload?.sentiment);

    const showing = await this.showingRepo.save(
      this.showingRepo.create({
        directTemplateId: '',
        emailEnabled: false,
        followUpEnabled: false,
        followUpGapDays: 0,
        followUpTemplateId: '',
        leadId: null,
        outreachAt: null,
        propertyId: property.id,
        propertyMatchMethod: 'Manual',
        propertyMatchScore: 1,
        propertyText: property.title,
        realtorEmail,
        realtorName,
        realtorPhone,
        showingAt,
        smsEnabled: false,
        sourceData: payload?.sourceData ?? {},
      }),
    );

    return this.feedbackRepo.save(
      this.feedbackRepo.create({
        channel,
        classifier: source === 'csv' ? 'CSV Import' : 'Manual',
        confidence: 1,
        feedbackText,
        firstMessageAt,
        leadId: null,
        propertyId: property.id,
        realtorContact,
        realtorName,
        realtorShowingId: showing.id,
        receivedAt,
        sentiment,
        sourceMessageId: `${source}-${randomUUID()}`,
      }),
    );
  }

  private resolveProperty(payload: any, properties: Property[]) {
    const requestedId = Number(payload?.propertyId);
    if (Number.isFinite(requestedId) && requestedId > 0) {
      return properties.find((item) => item.id === requestedId) ?? null;
    }

    const requested = this.normalizeText(payload?.property);
    if (!requested) return null;

    return (
      properties.find((item) => String(item.id) === requested) ??
      properties.find((item) =>
        [item.title, item.location, item.exactLocation]
          .map((value) => this.normalizeText(value))
          .some(
            (candidate) =>
              candidate === requested ||
              candidate.includes(requested) ||
              requested.includes(candidate),
          ),
      ) ??
      null
    );
  }

  private async reportContext(payload: any) {
    const propertyId = Number(payload.propertyId);
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found.');
    const fromDate = `${payload.fromDate ?? ''}`.trim();
    const toDate = `${payload.toDate ?? ''}`.trim();
    if (!fromDate || !toDate) {
      throw new BadRequestException('Choose from and to dates.');
    }
    const maxFeedback = Math.min(
      50,
      Math.max(1, Number(payload.maxFeedback) || 5),
    );
    const feedback = await this.feedbackRepo.find({
      where: {
        propertyId,
        firstMessageAt: Between(
          new Date(`${fromDate}T00:00:00Z`),
          new Date(`${toDate}T23:59:59.999Z`),
        ),
      },
      order: { firstMessageAt: 'ASC' },
      take: maxFeedback,
    });
    if (feedback.length === 0) {
      throw new BadRequestException('No feedback found in selected date range.');
    }
    const settings = await this.settingsService.getAdminSettings();
    const template = (settings.communicationTemplates ?? []).find(
      (item: any) =>
        item.id === payload.templateId && item.audience === 'OwnerFeedback',
    );
    if (!template) {
      throw new BadRequestException('Choose an owner feedback template.');
    }
    return { property, feedback, fromDate, toDate, template };
  }

  private async renderReport(context: any, summarize: boolean) {
    const summary = summarize
      ? await this.summarizeFeedback(
          context.feedback.map((item: ShowingFeedback) => item.feedbackText),
        )
      : '';
    const replacements: Record<string, string> = {
      '{{property_address}}': context.property.title,
      '{{fromdate}}': context.fromDate,
      '{{todate}}': context.toDate,
      '{{feedback_summary}}': summary,
    };
    context.feedback.forEach((item: ShowingFeedback, index: number) => {
      replacements[`{{feedback${index + 1}}}`] = `${index + 1}. ${item.feedbackText}`;
    });
    const render = (text: string) => {
      let output = `${text ?? ''}`;
      Object.entries(replacements).forEach(([token, value]) => {
        output = output.replaceAll(token, value);
      });
      return output
        .replace(/\{\{feedback\d+\}\}/g, '')
        .replace(/\{\{feedback_summary\}\}/g, '')
        .replace(/\{\{[^}]+\}\}/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    };
    return {
      body: render(context.template.body),
      feedbackCount: context.feedback.length,
      subject: render(context.template.subject),
      summarized: summarize,
    };
  }

  private async classifyFeedback(subject: string, message: string) {
    const fallback = this.heuristicClassification(message);
    const config = await this.settingsService.getAiProviderConfig();
    if (!config?.apiKey || !config?.model) return fallback;
    try {
      const parsed = await this.callAiJson(config, [
        {
          role: 'system',
          content:
            'Classify a realtor reply after a property showing. Return JSON only: isFeedback boolean, feedbackText string, sentiment positive|neutral|negative, confidence 0-1. Feedback means opinion, reaction, concern, condition, price, layout, location, buyer reaction, or recommendation about shown property. Greetings, acknowledgements, scheduling-only replies, and unrelated text are not feedback.',
        },
        {
          role: 'user',
          content: JSON.stringify({ subject, message: message.slice(0, 8000) }),
        },
      ]);
      return {
        classifier: 'AI',
        confidence: this.clamp(parsed?.confidence, fallback.confidence),
        feedbackText: `${parsed?.feedbackText ?? message}`.trim(),
        isFeedback: parsed?.isFeedback === true,
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed?.sentiment)
          ? parsed.sentiment
          : 'neutral',
      };
    } catch {
      return fallback;
    }
  }

  private async summarizeFeedback(feedback: string[]) {
    const fallback = feedback
      .slice(0, 5)
      .map((item) => item.replace(/\s+/g, ' ').trim())
      .join(' ')
      .slice(0, 700);
    const config = await this.settingsService.getAiProviderConfig();
    if (!config?.apiKey || !config?.model) return fallback;
    try {
      const parsed = await this.callAiJson(config, [
        {
          role: 'system',
          content:
            'Summarize property showing feedback in 1 to 5 concise lines for the property owner. Return JSON only with summary string. Preserve important positive and negative points.',
        },
        { role: 'user', content: JSON.stringify(feedback) },
      ]);
      return `${parsed?.summary ?? fallback}`.trim();
    } catch {
      return fallback;
    }
  }

  private heuristicClassification(message: string) {
    const normalized = message.toLowerCase();
    const terms = [
      'liked',
      'loved',
      'disliked',
      'feedback',
      'price',
      'expensive',
      'condition',
      'layout',
      'location',
      'room',
      'kitchen',
      'bathroom',
      'bedroom',
      'small',
      'large',
      'offer',
      'interested',
      'not interested',
      'buyer',
      'client',
      'property',
      'house',
      'apartment',
    ];
    const isFeedback =
      terms.some((term) => normalized.includes(term)) &&
      normalized.trim().length >= 12;
    return {
      classifier: 'Heuristic',
      confidence: isFeedback ? 0.55 : 0.2,
      feedbackText: message.trim(),
      isFeedback,
      sentiment: /love|liked|great|good|interested/.test(normalized)
        ? 'positive'
        : /dislike|bad|expensive|small|not interested/.test(normalized)
          ? 'negative'
          : 'neutral',
    };
  }

  private async callAiJson(config: any, messages: any[]) {
    const providerName = `${config.providerName ?? 'OpenAI'}`.toLowerCase();
    const baseUrl = `${
      config.baseUrl ??
      (providerName.includes('openai') ? 'https://api.openai.com/v1' : '')
    }`.replace(/\/+$/, '');
    if (!baseUrl) throw new Error('AI base URL missing.');
    const response = await fetch(`${baseUrl}/chat/completions`, {
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

  private normalizeChannel(value: unknown, hasEmail: string) {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    if (normalized === 'sms' || normalized === 'text' || normalized === 'message') {
      return 'Sms';
    }
    return hasEmail ? 'Email' : 'Sms';
  }

  private normalizeSentiment(value: unknown) {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    return ['positive', 'neutral', 'negative'].includes(normalized)
      ? normalized
      : 'neutral';
  }

  private cleanRecord(input: any) {
    return Object.fromEntries(
      Object.entries(input ?? {}).map(([key, value]) => [
        `${key}`.trim(),
        `${value ?? ''}`.trim(),
      ]),
    );
  }

  private value(record: Record<string, string>, column?: string) {
    return column ? `${record[column] ?? ''}`.trim() : '';
  }

  private normalizeText(value: unknown) {
    return `${value ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  private clamp(value: any, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
  }
}
