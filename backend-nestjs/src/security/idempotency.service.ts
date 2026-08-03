import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { IdempotencyRecord } from './idempotency-record.entity';

@Injectable()
export class IdempotencyService {
  constructor(@InjectRepository(IdempotencyRecord) private readonly records: Repository<IdempotencyRecord>) {}

  async execute<T extends Record<string, unknown>>(scope: string, rawKey: string, payload: unknown, work: () => Promise<T>): Promise<T> {
    const key = `${rawKey ?? ''}`.trim();
    if (!key || key.length > 160) throw new ConflictException('A valid idempotency key is required');
    const requestHash = createHash('sha256').update(JSON.stringify(payload ?? {})).digest('hex');
    const existing = await this.records.findOne({ where: { scope, key } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ConflictException('Idempotency key was already used with different request data');
      if (existing.status === 'completed' && existing.response) return existing.response as T;
      if (existing.status === 'processing') throw new ConflictException('This request is already being processed');
    }

    const record = existing ?? this.records.create({ scope, key, requestHash, status: 'processing', response: null, errorMessage: null });
    record.status = 'processing';
    record.errorMessage = null;
    await this.records.save(record);
    try {
      const result = await work();
      record.status = 'completed';
      record.response = result;
      await this.records.save(record);
      return result;
    } catch (error) {
      record.status = 'failed';
      record.errorMessage = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error';
      await this.records.save(record).catch(() => undefined);
      throw error;
    }
  }
}
