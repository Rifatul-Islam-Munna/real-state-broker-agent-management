import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { SaasTenantDomain } from '../saas-admin/entities/saas-tenant-domain.entity';
import { TenantContextService } from './tenant-context.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantPublicController } from './tenant-public.controller';
import { TenantResolutionMiddleware } from './tenant-resolution.middleware';
import { TenantResolutionService } from './tenant-resolution.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SaasTenant, SaasTenantDomain])],
  controllers: [TenantPublicController],
  providers: [TenantContextService, TenantDatabaseService, TenantResolutionService, TenantResolutionMiddleware],
  exports: [TenantContextService, TenantDatabaseService, TenantResolutionService],
})
export class TenantDatabaseModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolutionMiddleware).forRoutes('*');
  }
}
