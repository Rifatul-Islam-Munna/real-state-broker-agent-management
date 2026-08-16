import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasTenant } from '../saas-admin/entities/saas-tenant.entity';
import { UsersModule } from '../users/users.module';
import { AuthenticatedTenantGuard } from './authenticated-tenant.guard';
import { TenantDashboardController } from './tenant-dashboard.controller';
import { TenantDashboardService } from './tenant-dashboard.service';
import { TenantPlanPermissionGuard } from './tenant-plan-permission.guard';
import { TenantRealtorWorkflowService } from './tenant-realtor-workflow.service';
import { TenantShowingRequestPublicController } from './tenant-showing-request-public.controller';
import { TenantPropertyOperationsController } from './tenant-property-operations.controller';
import { TenantPropertyOperationsService } from './tenant-property-operations.service';
import { TenantWorkspaceSettingsController } from './tenant-workspace-settings.controller';
import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';
import { TenantLegacyCompatibilityController } from './tenant-legacy-compatibility.controller';
import { TenantLegacyCompatibilityService } from './tenant-legacy-compatibility.service';
import { TenantOutreachController } from './tenant-outreach.controller';
import { TenantOutreachService } from './tenant-outreach.service';
import { TenantOutreachDeliveryService } from './tenant-outreach-delivery.service';
import { TenantOutreachWorkerService } from './tenant-outreach-worker.service';
import { TenantGmailOauthController } from './tenant-gmail-oauth.controller';
import { TenantInboxController } from './tenant-inbox.controller';
import { TenantInboxSyncService } from './tenant-inbox-sync.service';
import { TenantMailInboxService } from './tenant-mail-inbox.service';
import { TenantSmsInboxController } from './tenant-sms-inbox.controller';
import { TenantSmsInboxService } from './tenant-sms-inbox.service';
import { TenantStaffPermissionGuard } from './tenant-staff-permission.guard';
import { TenantStaffController } from './tenant-staff.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SaasTenant]), UsersModule],
  controllers: [
    TenantDashboardController,
    TenantShowingRequestPublicController,
    TenantPropertyOperationsController,
    TenantWorkspaceSettingsController,
    TenantGmailOauthController,
    TenantLegacyCompatibilityController,
    TenantOutreachController,
    TenantInboxController,
    TenantSmsInboxController,
    TenantStaffController,
  ],
  providers: [
    TenantDashboardService,
    TenantRealtorWorkflowService,
    TenantPropertyOperationsService,
    TenantWorkspaceSettingsService,
    TenantLegacyCompatibilityService,
    TenantOutreachDeliveryService,
    TenantOutreachService,
    TenantOutreachWorkerService,
    TenantInboxSyncService,
    TenantMailInboxService,
    TenantSmsInboxService,
    AuthenticatedTenantGuard,
    TenantStaffPermissionGuard,
    TenantPlanPermissionGuard,
  ],
  exports: [TenantDashboardService, TenantRealtorWorkflowService],
})
export class TenantDashboardModule {}
