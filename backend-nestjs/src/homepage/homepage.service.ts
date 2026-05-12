import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomePageSettings } from './entities/homepage-settings.entity';

@Injectable()
export class HomepageService {
  constructor(
    @InjectRepository(HomePageSettings)
    private homepageRepository: Repository<HomePageSettings>,
  ) {}

  async getAdminSettings() {
    let settings = await this.homepageRepository.findOne({ where: {} });
    if (!settings) {
      settings = this.homepageRepository.create();
      await this.homepageRepository.save(settings);
    }
    return settings;
  }

  async updateSettings(dto: any) {
    const settings = await this.getAdminSettings();
    Object.assign(settings, dto);
    return this.homepageRepository.save(settings);
  }

  async getPublicSettings() {
    return this.getAdminSettings();
  }
}
