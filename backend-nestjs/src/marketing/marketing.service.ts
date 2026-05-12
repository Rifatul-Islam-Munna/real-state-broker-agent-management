import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingSettings } from './entities/marketing.entity';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(MarketingSettings)
    private marketingRepo: Repository<MarketingSettings>,
  ) {}

  async getSettings() {
    let settings = await this.marketingRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.marketingRepo.create();
      await this.marketingRepo.save(settings);
    }
    return settings;
  }

  async updateSettings(dto: any) {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return this.marketingRepo.save(settings);
  }
}
