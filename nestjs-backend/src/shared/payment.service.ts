import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OperationsRecordEntity, OperationsRecordRow } from '../database/entities/record.entity';
import { ActivityLogService } from '../core/activity-log.service';
import { ExternalPublicService } from '../core/external-public.service';
import { PlatformSettingsService } from './platform-settings.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(OperationsRecordEntity) private records: Repository<OperationsRecordRow>,
    private access: ExternalPublicService,
    private platform: PlatformSettingsService,
    private activity: ActivityLogService,
  ) {}

  async create(code: string, successUrl: string, cancelUrl: string) {
    const request = await this.access.find(code, false);
    if (!request.parentRecordId) throw new NotFoundException('No billing record is linked to this request.');
    const bill = await this.records.findOneBy({ id: request.parentRecordId });
    if (!bill || !['billing', 'finance'].includes(bill.moduleKey)) throw new BadRequestException('Only billing or finance records can be paid.');
    const settings = await this.platform.get();
    const endpoint = String(this.pick(settings.payment, ['checkouturl', 'createurl', 'apiurl']) ?? '');
    if (!endpoint) throw new BadRequestException('No payment provider is configured in the main dashboard.');
    const amount = Number(bill.amount ?? 0);
    if (amount <= 0) throw new BadRequestException('A positive billing amount is required.');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: settings.currency, title: bill.title, reference: String(bill.id), successUrl, cancelUrl }),
    });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new BadRequestException('The configured payment provider rejected the request.');
    const reference = String(payload.reference ?? payload.id ?? bill.id);
    request.payload = { ...request.payload, paymentReference: reference, paymentStatus: 'Pending' };
    await this.records.save(request);
    await this.activity.add({ workspaceId: request.workspaceId, moduleKey: 'billing', action: 'checkout-created', entityType: 'Record', entityId: String(bill.id), actorType: 'External', summary: `Checkout created for ${bill.title}.`, metadata: { amount, currency: settings.currency } });
    return { checkoutUrl: String(payload.checkoutUrl ?? payload.url ?? ''), sessionId: reference, paymentToken: reference };
  }

  async verify(code: string, reference: string) {
    const request = await this.access.find(code, true);
    if (!request.parentRecordId) throw new NotFoundException('No billing record is linked to this request.');
    const bill = await this.records.findOneBy({ id: request.parentRecordId });
    if (!bill) throw new NotFoundException('The linked billing record was not found.');
    const settings = await this.platform.get();
    const endpoint = String(this.pick(settings.payment, ['verifyurl', 'statusurl']) ?? '');
    if (!endpoint) throw new BadRequestException('Payment verification is not configured in the main dashboard.');
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference }) });
    const payload = await response.json() as Record<string, unknown>;
    const paid = response.ok && Boolean(payload.paid ?? payload.success ?? payload.verified);
    request.payload = { ...request.payload, paymentReference: reference, paymentStatus: paid ? 'Paid' : 'Pending' };
    if (paid) {
      bill.status = 'Paid';
      bill.completedAt = new Date();
      request.status = 'Completed';
      request.completedAt = new Date();
    }
    await Promise.all([this.records.save(request), this.records.save(bill)]);
    return { paid, paymentStatus: paid ? 'paid' : 'pending' };
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
