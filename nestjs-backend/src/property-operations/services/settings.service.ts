import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UpdateSettingsDto } from '../dto/settings.dto';
import { OperationsSettings, OperationsSettingsDocument } from '../schemas/public-access.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(OperationsSettings.name) private readonly settings: Model<OperationsSettingsDocument>,
    private readonly activity: ActivityService,
  ) {}

  async get() {
    return (await this.settings.findOne()) ?? this.settings.create({});
  }

  async update(dto: UpdateSettingsDto) {
    const item = await this.get();
    Object.assign(item, dto);
    await item.save();
    await this.activity.add({ moduleKey: 'organization', action: 'settings-updated', entityType: 'Settings', entityId: String(item._id), summary: 'Property Operations settings updated.' });
    return item.toObject();
  }
}
