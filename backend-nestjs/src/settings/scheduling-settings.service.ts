import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_AGENCY_TIME_ZONE,
  normalizeTimeZone,
} from '../common/time-zone';
import { AgencySchedulingSettings } from './entities/scheduling-settings.entity';

@Injectable()
export class SchedulingSettingsService {
  constructor(
    @InjectRepository(AgencySchedulingSettings)
    private readonly repository: Repository<AgencySchedulingSettings>,
  ) {}

  async getSettings() {
    const settings = await this.getOrCreate();

    return {
      morningOutreachHour: settings.morningOutreachHour,
      timeZone: normalizeTimeZone(settings.timeZone),
      updatedAt: settings.updatedAt,
    };
  }

  async updateSettings(input: any) {
    const settings = await this.getOrCreate();
    settings.timeZone = normalizeTimeZone(
      input?.timeZone,
      settings.timeZone || DEFAULT_AGENCY_TIME_ZONE,
    );
    settings.morningOutreachHour = this.clampHour(
      input?.morningOutreachHour,
      settings.morningOutreachHour,
    );

    const saved = await this.repository.save(settings);
    return {
      morningOutreachHour: saved.morningOutreachHour,
      timeZone: saved.timeZone,
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
      this.repository.create({
        id: 1,
        morningOutreachHour: 9,
        timeZone: DEFAULT_AGENCY_TIME_ZONE,
      }),
    );
  }

  private clampHour(value: unknown, fallback = 9) {
    const parsed = Number.parseInt(`${value ?? ''}`, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(23, parsed));
  }
}
