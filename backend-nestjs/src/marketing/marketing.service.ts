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
    const record = await this.marketingRepo.findOne({ where: { id: 1 } });
    return { ...this.normalize(this.read(record?.contentJson)), updatedAt: record?.updatedAt ?? null };
  }

  async updateSettings(dto: any) {
    let record = await this.marketingRepo.findOne({ where: { id: 1 } });
    if (!record) record = this.marketingRepo.create({ id: 1 });
    const payload = this.normalize(dto);
    record.contentJson = JSON.stringify(payload);
    const saved = await this.marketingRepo.save(record);
    return { ...payload, updatedAt: saved.updatedAt };
  }

  private read(value?: string) {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  private normalize(input: any) {
    const defaults = this.defaults();
    return {
      summary: {
        emailOpenRate: this.metric(input?.summary?.emailOpenRate),
        smsCtr: this.metric(input?.summary?.smsCtr),
        conversions: this.metric(input?.summary?.conversions),
        socialReach: this.metric(input?.summary?.socialReach),
      },
      emailCampaigns: Array.isArray(input?.emailCampaigns) ? input.emailCampaigns : [],
      smsStatuses: Array.isArray(input?.smsStatuses) ? input.smsStatuses : [],
      homepageBoost: {
        title: this.text(input?.homepageBoost?.title),
        description: this.text(input?.homepageBoost?.description),
        buttonLabel: this.text(input?.homepageBoost?.buttonLabel),
        slots: Array.isArray(input?.homepageBoost?.slots) && input.homepageBoost.slots.length
          ? input.homepageBoost.slots
          : defaults.homepageBoost.slots,
      },
      templates: Array.isArray(input?.templates) ? input.templates : [],
      socialSharing: {
        autoPostEnabled: input?.socialSharing?.autoPostEnabled === true,
        autoPostMessage: this.text(input?.socialSharing?.autoPostMessage),
        channels: Array.isArray(input?.socialSharing?.channels) && input.socialSharing.channels.length
          ? input.socialSharing.channels
          : defaults.socialSharing.channels,
      },
    };
  }

  private metric(value: any) {
    return {
      value: this.text(value?.value),
      deltaLabel: this.text(value?.deltaLabel),
      progressPercent: Math.min(100, Math.max(0, Number(value?.progressPercent) || 0)),
      trendDirection: ['Up', 'Down', 'Stable'].includes(value?.trendDirection) ? value.trendDirection : 'Stable',
    };
  }

  private text(value: any) { return `${value ?? ''}`.trim(); }

  private defaults() {
    return {
      homepageBoost: {
        slots: [
          { id: 'boost-slot-1', propertyId: null, isActive: false },
          { id: 'boost-slot-2', propertyId: null, isActive: false },
        ],
      },
      socialSharing: {
        channels: [
          { id: 'facebook', label: 'Facebook', icon: 'social_leaderboard', accentClassName: 'bg-blue-600', isEnabled: false },
          { id: 'twitter', label: 'Twitter', icon: 'share', accentClassName: 'bg-sky-400', isEnabled: false },
          { id: 'instagram', label: 'Instagram', icon: 'photo_camera', accentClassName: 'bg-pink-600', isEnabled: false },
          { id: 'linkedin', label: 'LinkedIn', icon: 'work', accentClassName: 'bg-blue-800', isEnabled: false },
        ],
      },
    };
  }
}
