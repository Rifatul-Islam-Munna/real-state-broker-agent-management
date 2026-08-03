import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantDashboardController } from './tenant-dashboard.controller';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([SaasTenant])],
  controllers: [TenantDashboardController],
  providers: [TenantDashboardService, AuthenticatedTenantGuard, TenantPlanPermissionGuard],
})
export class TenantDashboardModule {}
