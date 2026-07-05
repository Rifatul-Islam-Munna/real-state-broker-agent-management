import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { ActivityLogService } from '../core/activity-log.service';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
    private platform: PlatformSettingsService,
    private activity: ActivityLogService,
  ) {}

  async send(id: string, channel: string) {
    const item = await this.records.findOneBy({ id: Number(id) });
    if (!item) throw new NotFoundException('Notification record was not found.');
    const settings = await this.platform.get();
    const mode = channel.toLowerCase();
    try {
      if (mode === 'email') await this.email(settings.smtp, item);
      else if (mode === 'sms' || mode === 'whatsapp') await this.message(settings.sms, item, mode);
      else throw new BadRequestException('Delivery channel must be email, sms, or whatsapp.');
      item.status = 'Sent';
      item.payload = { ...item.payload, deliveryChannel: mode, deliveredAt: new Date().toISOString() };
      await this.records.save(item);
      await this.activity.add({ workspaceId: item.workspaceId, moduleKey: item.moduleKey, action: 'notification-sent', entityType: 'Record', entityId: id, summary: `${item.title} sent by ${mode}.` });
      return item;
    } catch (error) {
      item.status = 'Failed';
      item.payload = { ...item.payload, deliveryChannel: mode, deliveryError: error instanceof Error ? error.message : 'Delivery failed' };
      await this.records.save(item);
      throw error;
    }
  }

  private async email(config: Record<string, unknown>, item: OperationsRecordRow) {
    if (!item.contactEmail) throw new BadRequestException('A recipient email is required.');
    const host = String(this.pick(config, ['host', 'smtphost']) ?? '');
    const user = String(this.pick(config, ['username', 'user', 'smtpusername']) ?? '');
    const pass = String(this.pick(config, ['password', 'pass', 'smtppassword']) ?? '');
    const from = String(this.pick(config, ['from', 'fromemail', 'senderemail']) ?? user);
    if (!host || !user || !pass) throw new BadRequestException('SMTP is not configured in the main dashboard.');
    const port = Number(this.pick(config, ['port', 'smtpport']) ?? 587);
    const secure = Boolean(this.pick(config, ['secure', 'usessl'])) || port === 465;
    const transport = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transport.sendMail({ from, to: item.contactEmail, subject: item.title, text: item.description || item.title });
  }

  private async message(config: Record<string, unknown>, item: OperationsRecordRow, channel: string) {
    if (!item.contactPhone) throw new BadRequestException('A recipient phone number is required.');
    const webhook = String(this.pick(config, ['webhookurl', 'apiurl', 'endpoint']) ?? '');
    if (webhook) {
      const response = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, to: item.contactPhone, message: item.description || item.title }) });
      if (!response.ok) throw new BadRequestException(`Message provider returned ${response.status}.`);
      return;
    }
    const sid = String(this.pick(config, ['accountsid', 'sid']) ?? '');
    const token = String(this.pick(config, ['authtoken', 'token']) ?? '');
    const from = String(this.pick(config, ['from', 'fromnumber', 'phonenumber']) ?? '');
    if (!sid || !token || !from) throw new BadRequestException('SMS is not configured in the main dashboard.');
    const body = new URLSearchParams({ From: channel === 'whatsapp' ? `whatsapp:${from}` : from, To: channel === 'whatsapp' ? `whatsapp:${item.contactPhone}` : item.contactPhone, Body: item.description || item.title });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new BadRequestException(`SMS provider returned ${response.status}.`);
  }

  private pick(value: unknown, keys: string[]): unknown {
    if (!value || typeof value !== 'object') return undefined;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (keys.includes(key.replace(/[_-]/g, '').toLowerCase())) return item;
      const nested = this.pick(item, keys);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }
}
