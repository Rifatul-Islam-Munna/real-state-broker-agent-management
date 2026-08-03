import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

function repo() {
  const rows: any[] = [];
  return {
    rows,
    findOne: jest.fn(async ({ where }: any) => rows.find((row) => row.scope === where.scope && row.key === where.key) ?? null),
    create: jest.fn((value: any) => ({ ...value, id: rows.length + 1 })),
    save: jest.fn(async (value: any) => {
      const index = rows.findIndex((row) => row.id === value.id);
      if (index >= 0) rows[index] = value; else rows.push(value);
      return value;
    }),
  };
}

describe('IdempotencyService', () => {
  it('executes once and returns the stored response for a repeated completed request', async () => {
    const repository = repo();
    const service = new IdempotencyService(repository as any);
    const work = jest.fn(async () => ({ tenant: { id: 7 } }));

    const first = await service.execute('tenant-purchase', 'PAY-1', { planId: 2 }, work);
    const second = await service.execute('tenant-purchase', 'PAY-1', { planId: 2 }, work);

    expect(first).toEqual(second);
    expect(work).toHaveBeenCalledTimes(1);
    expect(repository.rows[0]).toMatchObject({ status: 'completed', scope: 'tenant-purchase', key: 'PAY-1' });
  });

  it('rejects a reused key with different request data', async () => {
    const repository = repo();
    const service = new IdempotencyService(repository as any);
    await service.execute('tenant-purchase', 'PAY-2', { planId: 1 }, async () => ({ ok: true }));
    await expect(service.execute('tenant-purchase', 'PAY-2', { planId: 2 }, async () => ({ ok: true }))).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects concurrent processing and records failed attempts for safe retry', async () => {
    const repository = repo();
    const service = new IdempotencyService(repository as any);
    repository.rows.push({ id: 1, scope: 'tenant-purchase', key: 'PAY-3', requestHash: require('node:crypto').createHash('sha256').update(JSON.stringify({ planId: 1 })).digest('hex'), status: 'processing', response: null });
    await expect(service.execute('tenant-purchase', 'PAY-3', { planId: 1 }, async () => ({ ok: true }))).rejects.toThrow('already being processed');

    const failingRepo = repo();
    const failing = new IdempotencyService(failingRepo as any);
    await expect(failing.execute('tenant-purchase', 'PAY-4', { planId: 1 }, async () => { throw new Error('provision failed'); })).rejects.toThrow('provision failed');
    expect(failingRepo.rows[0]).toMatchObject({ status: 'failed', errorMessage: 'provision failed' });
  });
});
