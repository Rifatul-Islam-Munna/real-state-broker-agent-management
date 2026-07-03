import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

    if (fromDate && toDate) {
      const zone = await this.schedulingSettingsService.getTimeZone();
      const range = dateRangeInZone(fromDate, toDate, zone);
      if (!range) throw new BadRequestException('Feedback date range is invalid.');
      qb.andWhere('feedback.first_message_at >= :start', { start: range.start });
      qb.andWhere('feedback.first_message_at < :endExclusive', {
        endExclusive: range.endExclusive,
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
    return this.renderReport(context, payload?.summarize === true);
  }

  async sendReport(payload: any) {
    const context = await this.reportContext(payload);
    const rendered = await this.renderReport(context, payload?.summarize === true);
    const channels = Array.isArray(payload?.channels) ? payload.channels : [];
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
        { body: rendered.body, to: context.property.ownerPhone },
        'Showing Feedback',
      );
      if (result.status === 'Failed') {
        throw new BadRequestException('Owner SMS failed.');
      }
      sent.push('SMS');
    }

    return { ...rendered, sent };
  }

  private async reportContext(payload: any) {
    const propertyId = Number(payload?.propertyId);
    const property = await this.propertyRepo.findOne({ where: { id: propertyId } });
    if (!property) throw new NotFoundException('Property not found.');

    const fromDate = `${payload?.fromDate ?? ''}`.trim();
    const toDate = `${payload?.toDate ?? ''}`.trim();
    const zone = await this.schedulingSettingsService.getTimeZone();
    const range = dateRangeInZone(fromDate, toDate, zone);
    if (!range) throw new BadRequestException('Choose a valid from and to date.');

    const maxFeedback = Math.min(
      50,
      Math.max(1, Number(payload?.maxFeedback) || 5),
    );
    const feedback = await this.feedbackRepo
      .createQueryBuilder('feedback')
      .where('feedback.property_id = :propertyId', { propertyId })
      .andWhere('feedback.first_message_at >= :start', { start: range.start })
      .andWhere('feedback.first_message_at < :endExclusive', {
        endExclusive: range.endExclusive,
      })
      .orderBy('feedback.first_message_at', 'ASC')
      .take(maxFeedback)
      .getMany();
    if (feedback.length === 0) {
      throw new BadRequestException('No feedback found in selected date range.');
    }

    const settings = await this.settingsService.getAdminSettings();
    const template = (settings.communicationTemplates ?? []).find(
      (item: any) =>
        item.id === payload?.templateId && item.audience === 'OwnerFeedback',
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
      for (const [token, value] of Object.entries(replacements)) {
        output = output.replaceAll(token, value);
      }
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
            'Summarize property showing feedback in 1 to 5 concise lines for the property owner. Return JSON only with summary string.',
        },
        { role: 'user', content: JSON.stringify(feedback) },
      ]);
      return `${parsed?.summary ?? fallback}`.trim();
    } catch {
      return fallback;
    }
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
}
