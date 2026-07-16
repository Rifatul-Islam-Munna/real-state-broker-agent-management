import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizePhoneNumber } from '../common/phone-normalizer';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { SettingsService } from '../settings/settings.service';
import { ShowingFeedback } from '../showing-feedback/entities/showing-feedback.entity';
import { Realtor } from './entities/realtor.entity';

@Injectable()
export class RealtorsService {
  constructor(
    @InjectRepository(Realtor) private readonly realtorRepo: Repository<Realtor>,
    @InjectRepository(RealtorShowing) private readonly showingRepo: Repository<RealtorShowing>,
    @InjectRepository(ShowingFeedback) private readonly feedbackRepo: Repository<ShowingFeedback>,
    private readonly settings: SettingsService,
  ) {}

  async findAll(search = '') {
    const qb = this.realtorRepo.createQueryBuilder('realtor');
    const query = `${search ?? ''}`.trim();
    if (query) {
      qb.where('(realtor.name ILIKE :query OR realtor.email ILIKE :query OR realtor.phone ILIKE :query OR realtor.brokerage ILIKE :query)', { query: `%${query}%` });
    }
    return qb.orderBy('realtor.updatedAt', 'DESC').getMany();
  }

  async create(dto: any) {
    const normalized = await this.normalize(dto);
    if (!normalized.email && !normalized.phone) throw new BadRequestException('Email or phone is required.');
    const existing = await this.findMatching(normalized.email, normalized.phone);
    if (existing) {
      Object.assign(existing, { ...normalized, name: normalized.name || existing.name });
      return this.realtorRepo.save(existing);
    }
    return this.realtorRepo.save(this.realtorRepo.create(normalized));
  }

  async update(id: number, dto: any) {
    const realtor = await this.realtorRepo.findOne({ where: { id } });
    if (!realtor) throw new NotFoundException('Realtor not found.');
    Object.assign(realtor, await this.normalize(dto));
    return this.realtorRepo.save(realtor);
  }

  async importRows(payload: any) {
    const rows = Array.isArray(payload?.rows) ? payload.rows.slice(0, 2000) : [];
    if (!rows.length) throw new BadRequestException('CSV has no data rows.');
    const mapping = payload?.mapping ?? {};
    const failures: string[] = [];
    let createdCount = 0;
    for (let index = 0; index < rows.length; index++) {
      try {
        const row = this.clean(rows[index]);
        await this.create({
          brokerage: this.cell(row, mapping.brokerage),
          email: this.cell(row, mapping.email),
          name: this.cell(row, mapping.name),
          notes: this.cell(row, mapping.notes),
          phone: this.cell(row, mapping.phone),
        });
        createdCount++;
      } catch (error: any) {
        failures.push(`Row ${index + 2}: ${error?.message ?? 'Import failed.'}`);
      }
    }
    return { createdCount, failedCount: failures.length, failures };
  }

  async history(id: number) {
    const realtor = await this.realtorRepo.findOne({ where: { id } });
    if (!realtor) throw new NotFoundException('Realtor not found.');
    const email = realtor.email.toLowerCase();
    const phone = realtor.phone.replace(/\D/g, '');
    const showingsQb = this.showingRepo
      .createQueryBuilder('showing')
      .leftJoinAndSelect('showing.property', 'property')
      .where('1 = 0');
    if (email) showingsQb.orWhere('LOWER(showing.realtorEmail) = :email', { email });
    if (phone) {
      showingsQb.orWhere("regexp_replace(showing.realtorPhone, '[^0-9]', '', 'g') = :phone", { phone });
    }
    if (realtor.name) {
      showingsQb.orWhere('LOWER(showing.realtorName) = :name', { name: realtor.name.toLowerCase() });
    }
    const showings = await showingsQb.orderBy('showing.showingAt', 'DESC').getMany();

    const feedbackQb = this.feedbackRepo
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.property', 'property')
      .where('1 = 0');
    if (realtor.name) feedbackQb.orWhere('LOWER(feedback.realtorName) = :name', { name: realtor.name.toLowerCase() });
    if (email) feedbackQb.orWhere('LOWER(feedback.realtorContact) = :email', { email });
    if (phone) feedbackQb.orWhere("regexp_replace(feedback.realtorContact, '[^0-9]', '', 'g') = :phone", { phone });
    const feedback = await feedbackQb.orderBy('feedback.receivedAt', 'DESC').getMany();

    const timeline = [
      ...showings.map((item) => ({
        id: `showing-${item.id}`,
        kind: 'Showing',
        at: item.showingAt ?? item.createdAt,
        title: item.property?.title || item.propertyText || 'Property showing',
        detail: item.property?.location || item.propertyText || '',
        status: item.sequenceStatus || item.propertyMatchMethod,
      })),
      ...feedback.map((item) => ({
        id: `feedback-${item.id}`,
        kind: 'Feedback',
        at: item.receivedAt,
        title: item.property?.title || 'Showing feedback',
        detail: item.feedbackText,
        sentiment: item.sentiment,
        status: item.classifier,
      })),
    ].sort((left, right) => Number(new Date(right.at)) - Number(new Date(left.at)));

    return {
      feedbackCount: feedback.length,
      realtor,
      showingCount: showings.length,
      timeline,
    };
  }

  async findMatching(email?: string, phone?: string) {
    const normalizedEmail = `${email ?? ''}`.trim().toLowerCase();
    const normalizedPhone = `${phone ?? ''}`.replace(/\D/g, '');
    if (!normalizedEmail && !normalizedPhone) return null;
    const qb = this.realtorRepo.createQueryBuilder('realtor');
    if (normalizedEmail && normalizedPhone) {
      qb.where('LOWER(realtor.email) = :email OR regexp_replace(realtor.phone, \'[^0-9]\', \'\', \'g\') = :phone', { email: normalizedEmail, phone: normalizedPhone });
    } else if (normalizedEmail) {
      qb.where('LOWER(realtor.email) = :email', { email: normalizedEmail });
    } else {
      qb.where('regexp_replace(realtor.phone, \'[^0-9]\', \'\', \'g\') = :phone', { phone: normalizedPhone });
    }
    return qb.getOne();
  }

  private async normalize(dto: any) {
    const settings = await this.settings.getAdminSettings();
    const country = settings.profile?.defaultPhoneCountry ?? 'US';
    return {
      brokerage: `${dto?.brokerage ?? ''}`.trim(),
      email: `${dto?.email ?? ''}`.trim().toLowerCase(),
      name: `${dto?.name ?? ''}`.trim(),
      notes: `${dto?.notes ?? ''}`.trim(),
      phone: normalizePhoneNumber(dto?.phone, country),
    };
  }

  private clean(input: any) { return Object.fromEntries(Object.entries(input ?? {}).map(([key, value]) => [`${key}`.trim(), `${value ?? ''}`.trim()])); }
  private cell(record: Record<string, string>, column?: string) { return column ? `${record[column] ?? ''}`.trim() : ''; }
}
