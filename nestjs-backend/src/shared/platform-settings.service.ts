import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export type PlatformSettings = {
  businessName: string;
  logoUrl: string;
  brandColor: string;
  publicBaseUrl: string;
  currency: string;
  smtp: Record<string, unknown>;
  sms: Record<string, unknown>;
  payment: Record<string, unknown>;
  ai: Record<string, unknown>;
};

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly db: DataSource) {}

  async get(): Promise<PlatformSettings> {
    const agency = await this.row('agency_settings');
    const integrations = await this.row('agency_integration_settings');
    const source = { ...agency, ...this.parseValues(agency) };
    return {
      businessName: String(this.find(source, ['businessname', 'agencyname', 'companyname', 'name']) ?? 'Property Operations'),
      logoUrl: String(this.find(source, ['logourl', 'logo']) ?? ''),
      brandColor: String(this.find(source, ['brandcolor', 'primarycolor']) ?? '#111827'),
      publicBaseUrl: String(this.find(source, ['publicbaseurl', 'websiteurl', 'frontendurl']) ?? ''),
      currency: String(this.find(source, ['currencycode', 'defaultcurrency', 'currency']) ?? 'USD').toUpperCase(),
      smtp: this.payload(integrations, ['smtp_payload', 'email_payload']),
      sms: this.payload(integrations, ['twilio_payload', 'plivo_payload', 'sms_payload']),
      payment: this.payload(integrations, ['payment_payload', 'stripe_payload', 'sslcommerz_payload', 'bkash_payload']),
      ai: this.payload(integrations, ['ai_provider_payload']),
    };
  }

  private async row(table: string): Promise<Record<string, unknown>> {
    try {
      const rows = await this.db.query(`SELECT * FROM ${table} ORDER BY id LIMIT 1`);
      return rows[0] ?? {};
    } catch {
      return {};
    }
  }

  private parseValues(row: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) Object.assign(result, this.parse(value), { [key]: value });
    return result;
  }

  private payload(row: Record<string, unknown>, keys: string[]) {
    for (const key of keys) if (row[key] != null) return this.parse(row[key]);
    return {};
  }

  private parse(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') return value as Record<string, unknown>;
    if (typeof value !== 'string') return {};
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }

  private find(value: unknown, keys: string[]): unknown {
    if (!value || typeof value !== 'object') return undefined;
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (keys.includes(key.replace(/[_-]/g, '').toLowerCase())) return item;
      const nested = this.find(item, keys);
      if (nested !== undefined) return nested;
    }
    return undefined;
  }
}
