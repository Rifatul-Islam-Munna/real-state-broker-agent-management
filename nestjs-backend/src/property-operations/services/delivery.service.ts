import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OperationsRecord, OperationsRecordDocument } from '../schemas/operations.schema';
import { ActivityService } from './activity.service';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectModel(OperationsRecord.name) private readonly records: Model<OperationsRecordDocument>,
    private readonly config: ConfigService,
    private readonly activity: ActivityService,
  ) {}

  async send(id: string, channel: string) {
    const item = await this.records.findById(id);
    if (!item) throw new NotFoundException('Notification record was not found.');
    const normalized = channel.toLowerCase();
    const endpoint = this.config.get<string>(`PROPERTY_OPERATIONS_${normalized.toUpperCase()}_WEBHOOK`);
    if (!endpoint) throw new BadRequestException(`${normalized} delivery is not configured.`);
    const recipient = normalized === 'email' ? item.contact.email : item.contact.phone;
    if (!recipient) throw new BadRequestException(`A recipient ${normalized === 'email' ? 'email' : 'phone number'} is required.`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: normalized, recipient, title: item.title, message: item.description, attachments: item.attachments, metadata: item.payload }),
      });
      if (!response.ok) throw new Error(`Provider returned ${response.status}`);
      item.status = 'Sent';
      item.payload = { ...item.payload, deliveryChannel: normalized, deliveredAt: new Date().toISOString() };
      await item.save();
      await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'notification-sent', entityType: 'Record', entityId: id, summary: `${item.title} sent by ${normalized}.` });
      return item.toObject();
    } catch (error) {
      item.status = 'Failed';
      item.payload = { ...item.payload, deliveryChannel: normalized, deliveryError: error instanceof Error ? error.message : 'Delivery failed' };
      await item.save();
      await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'notification-failed', entityType: 'Record', entityId: id, summary: `${item.title} delivery failed.` });
      throw new BadRequestException(error instanceof Error ? error.message : 'Delivery failed.');
    }
  }
}
