import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_AGENCY_TIME_ZONE,
  normalizeTimeZone,
} from '../common/time-zone';
import { AgencySettings } from './entities/settings.entity';

@Injectable()
export class SchedulingSettingsService {
  constructor(
    @InjectRepository(AgencySettings)
    private readonly repository: Repository<AgencySettings>,
  ) {}

  async getSettings() {
    const record = await this.getOrCreate();
    const content = this.readJson(record.contentJson);
    const scheduling = this.normalize(content.scheduling);

    return {
      ...scheduling,
      updatedAt: record.updatedAt,
    };
  }

  async updateSettings(input: any) {
    const record = await this.getOrCreate();
    const content = this.readJson(record.contentJson);
    const current = this.normalize(content.scheduling);
    const scheduling = {
      morningOutreachHour: this.clampHour(
        input?.morningOutreachHour,
        current.morningOutreachHour,
      ),
      timeZone: normalizeTimeZone(
        input?.timeZone,
        current.timeZone || DEFAULT_AGENCY_TIME_ZONE,
      ),
    };

    record.contentJson = JSON.stringify({ ...content, scheduling });
    const saved = await this.repository.save(record);

    return {
      ...scheduling,
      updatedAt: saved.updatedAt,
    };
  }

  async getTimeZone() {
    return (await this.getSettings()).timeZone;
  }

  private async getOrCreate() {
    const existing = await this.repository.findOne({ where: { id: 1 } });
    if (existing) return existing;

    return this.repository.save(
      this.repository.create({ id: 1, contentJson: '{}' }),
    );
  }

  private normalize(value: any) {
    return {
      morningOutreachHour: this.clampHour(value?.morningOutreachHour, 9),
      timeZone: normalizeTimeZone(value?.timeZone),
    };
  }

  private readJson(value: string) {
    try {
      const parsed = JSON.parse(value || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private clampHour(value: unknown, fallback: number) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(23, parsed));
  }
}
