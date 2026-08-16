import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SaasAdminController } from './saas-admin.controller';
import { PublicSaasController } from './public-saas.controller';
import { SaasAdminService } from './saas-admin.service';
import { TenantProvisioningService } from './tenant-provisioning.service';
import { TenantDomainController } from './tenant-domain.controller';
import { TenantDomainService } from './tenant-domain.service';
import { SaasTenantDomain } from './entities/saas-tenant-domain.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SaasTenant } from './entities/saas-tenant.entity';
import { SaasAdminAuditLog } from './entities/saas-admin-audit-log.entity';
import { User } from '../users/entities/user.entity';
import { TenantSubscriptionController } from './tenant-subscription.controller';
import { TenantSubscriptionService } from './tenant-subscription.service';
import { TenantTrackingController } from './tenant-tracking.controller';
import { TenantTrackingService } from './tenant-tracking.service';
import { StripeCheckoutRecord } from './entities/stripe-checkout-record.entity';
import { StripeCheckoutService } from './stripe-checkout.service';
import { TenantAccountController } from './tenant-account.controller';
import { TenantAccountService } from './tenant-account.service';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, SaasTenant, SaasAdminAuditLog, SaasTenantDomain, StripeCheckoutRecord, User])],
  controllers: [SaasAdminController, PublicSaasController, TenantDomainController, TenantSubscriptionController, TenantTrackingController, TenantAccountController],
  providers: [
    SaasAdminService,
    TenantProvisioningService,
    TenantDomainService,
    TenantSubscriptionService,
    TenantTrackingService,
    StripeCheckoutService,
    TenantAccountService,
  ],
  exports: [SaasAdminService],
})
export class SaasAdminModule {}
