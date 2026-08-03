import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable } from '@nestjs/common';

export type TenantRequestContext = { tenantId: number; databaseName: string };

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): TenantRequestContext | undefined {
    return this.storage.getStore();
  }

  require(): TenantRequestContext {
    const context = this.get();
    if (!context) throw new Error('Tenant database context is missing');
    return context;
  }
}
