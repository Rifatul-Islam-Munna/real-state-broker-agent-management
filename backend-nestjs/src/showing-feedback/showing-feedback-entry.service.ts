import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { parseDateTimeInZone } from '../common/time-zone';
import { Property } from '../properties/entities/property.entity';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { ShowingFeedback } from './entities/showing-feedback.entity';

@Injectable()
export class ShowingFeedbackEntryService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    private readonly scheduling: SchedulingSettingsService,
    private readonly dataSource: DataSource,
  ) {}

  async createManual(payload: any) {
    const [properties, zone] = await Promise.all([
      this.propertyRepo.find(),
      this.scheduling.getTimeZone(),
    ]);
    return this.createRecord(payload, properties, zone, 'manual');
  }

  async importRows(payload: any) {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (!rows.length) throw new BadRequestException('CSV has no data rows.');
    const mapping = payload?.mapping ?? {};
    if (!mapping.property || !mapping.feedbackText) {
      throw new BadRequestException('Map Property and Feedback text.');
    }
    if (!mapping.firstMessageAt && !mapping.showingAt) {
      throw new BadRequestException(
        'Map First message date/time or Showing date/time.',
      );
    }

    const [properties, zone] = await Promise.all([
      this.propertyRepo.find(),
      this.scheduling.getTimeZone(),
    ]);
    const failures: string[] = [];
    let createdCount = 0;

    for (let index = 0; index < rows.length; index++) {
      try {
        const source = this.clean(rows[index]);
        await this.createRecord(
          {
            property: this.value(source, mapping.property),
            realtorName: this.value(source, mapping.realtorName),
            realtorContact: this.value(source, mapping.realtorContact),
            realtorEmail: this.value(source, mapping.realtorEmail),
            realtorPhone: this.value(source, mapping.realtorPhone),
            channel: this.value(source, mapping.channel),
            feedbackText: this.value(source, mapping.feedbackText),
            sentiment: this.value(source, mapping.sentiment),
            showingAt: this.value(source, mapping.showingAt),
            firstMessageAt:
              this.value(source, mapping.firstMessageAt) ||
              this.value(source, mapping.showingAt),
            receivedAt: this.value(source, mapping.receivedAt),
            sourceData: source,
          },
          properties,
          zone,
          'csv',
        );
        createdCount++;
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }

    return { createdCount, failedCount: failures.length, failures };
  }

  private async createRecord(
    payload: any,
    properties: Property[],
    zone: string,
    source: 'csv' | 'manual',
  ) {
    const property = this.resolveProperty(payload, properties);
    if (!property) throw new BadRequestException('Property could not be matched.');
    const feedbackText = `${payload?.feedbackText ?? ''}`.trim();
    if (!feedbackText) throw new BadRequestException('Feedback text is required.');

    const firstMessageAt = parseDateTimeInZone(
      payload?.firstMessageAt || payload?.showingAt,
      zone,
    );
    if (!firstMessageAt) {
      throw new BadRequestException('A valid feedback date and time is required.');
    }
    const showingAt =
      parseDateTimeInZone(payload?.showingAt, zone) ?? firstMessageAt;
    const receivedAt =
      parseDateTimeInZone(payload?.receivedAt, zone) ?? firstMessageAt;
    const realtorName = `${payload?.realtorName ?? ''}`.trim() || 'Realtor';
    const realtorEmail = `${payload?.realtorEmail ?? ''}`.trim().toLowerCase();
    const realtorPhone = `${payload?.realtorPhone ?? ''}`.trim();
    const realtorContact =
      `${payload?.realtorContact ?? ''}`.trim() || realtorEmail || realtorPhone;

    return this.dataSource.transaction(async (manager) => {
      const showingRepo = manager.getRepository(RealtorShowing);
      const feedbackRepo = manager.getRepository(ShowingFeedback);
      const showing = await showingRepo.save(
        showingRepo.create({
          directTemplateId: '',
          emailEnabled: false,
          followUpEnabled: false,
          followUpGapDays: 0,
          followUpTemplateId: '',
          leadId: null,
          outreachAt: null,
          propertyId: property.id,
          propertyMatchMethod: source === 'csv' ? 'Auto' : 'Manual',
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

      return feedbackRepo.save(
        feedbackRepo.create({
          channel: this.channel(payload?.channel, realtorEmail),
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
          sentiment: this.sentiment(payload?.sentiment),
          sourceMessageId: `${source}-${randomUUID()}`,
        }),
      );
    });
  }

  private resolveProperty(payload: any, properties: Property[]) {
    const id = Number(payload?.propertyId);
    if (Number.isFinite(id) && id > 0) {
      return properties.find((item) => item.id === id) ?? null;
    }
    const requested = this.normalize(payload?.property);
    if (!requested) return null;

    return (
      properties.find((item) => String(item.id) === requested) ??
      properties.find((item) =>
        [item.title, item.location, item.exactLocation]
          .map((value) => this.normalize(value))
          .filter(Boolean)
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

  private channel(value: unknown, email: string) {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    if (['sms', 'text', 'message'].includes(normalized)) return 'Sms';
    if (['email', 'mail'].includes(normalized)) return 'Email';
    return email ? 'Email' : 'Sms';
  }

  private sentiment(value: unknown) {
    const normalized = `${value ?? ''}`.trim().toLowerCase();
    return ['positive', 'neutral', 'negative'].includes(normalized)
      ? normalized
      : 'neutral';
  }

  private clean(input: any) {
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

  private normalize(value: unknown) {
    return `${value ?? ''}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }
}
