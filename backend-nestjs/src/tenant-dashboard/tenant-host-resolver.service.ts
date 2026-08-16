import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformDomainService } from '../platform-domain/platform-domain.service';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';

@Injectable()
export class TenantHostResolverService {
  constructor(
    @InjectRepository(SaasTenant)
    private readonly tenantRepository: Repository<SaasTenant>,
    private readonly platformDomain: PlatformDomainService,
  ) {}

  async resolveRequest(request: any) {
    const host = this.requestHost(request);
    const tenant = await this.resolveHost(host);
    if (!tenant || tenant.isBlocked || !tenant.isActive) {
      throw new NotFoundException('Tenant workspace was not found.');
    }
    if (tenant.databaseStatus !== 'ready' || !tenant.databaseName) {
      throw new ServiceUnavailableException('Tenant workspace is not ready.');
    }
    return tenant;
  }

  async resolveHost(hostValue: string) {
    const host = this.normalizeHost(hostValue);
    if (!host) return null;

    const primary = this.normalizeHost(this.platformDomain.getPrimaryDomain());
    if (primary && host.endsWith(`.${primary}`)) {
      const subdomain = host.slice(0, -(primary.length + 1));
      if (subdomain && !subdomain.includes('.')) {
        return this.tenantRepository.findOne({ where: { subdomain } });
      }
    }

    if (process.env.NODE_ENV !== 'production') {
      const localSuffix = host.endsWith('.localhost')
        ? '.localhost'
        : host.endsWith('.127.0.0.1')
          ? '.127.0.0.1'
          : '';
      if (localSuffix) {
        const subdomain = host.slice(0, -localSuffix.length);
        if (subdomain && !subdomain.includes('.')) {
          return this.tenantRepository.findOne({ where: { subdomain } });
        }
      }
    }

    const tenants = await this.tenantRepository.find({
      where: { databaseStatus: 'ready' } as any,
    });
    return (
      tenants.find((tenant) => {
        const record = tenant as any;
        return [record.customDomain, record.custom_domain, record.domain]
          .map((value) => this.normalizeHost(value))
          .filter(Boolean)
          .includes(host);
      }) ?? null
    );
  }

  requestHost(request: any) {
    const raw =
      request.headers?.['x-tenant-host'] ??
      request.headers?.['x-forwarded-host'] ??
      request.headers?.host ??
      '';
    return this.normalizeHost(Array.isArray(raw) ? raw[0] : raw);
  }

  private normalizeHost(value: any) {
    return `${value ?? ''}`
      .split(',')[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, '');
  }
}
