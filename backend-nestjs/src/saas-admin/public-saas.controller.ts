import { Body, Controller, Get, Headers, HttpCode, Post } from '@nestjs/common';
import { IdempotencyService } from '../security/idempotency.service';
import { SaasAdminService } from './saas-admin.service';
import { TenantProvisioningService } from './tenant-provisioning.service';

@Controller('public-saas')
export class PublicSaasController {
  constructor(
    private readonly service: SaasAdminService,
    private readonly provisioning: TenantProvisioningService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Get('plans')
  listActivePlans() {
    return this.service.listActivePublicPlans();
  }

  @Post('purchase')
  @HttpCode(201)
  purchase(@Body() dto: any, @Headers('idempotency-key') headerKey?: string) {
    const key = `${headerKey ?? dto.purchaseReference ?? ''}`.trim();
    return this.idempotency.execute('tenant-purchase', key, dto, async () => {
      const result = await this.provisioning.provisionAfterSuccessfulPurchase(dto);
      return {
        tenant: {
          id: result.tenant.id,
          businessName: result.tenant.businessName,
          slug: result.tenant.slug,
          subdomain: result.tenant.subdomain,
          planId: result.tenant.planId,
          dashboardPermissions: result.tenant.dashboardPermissions,
          subscriptionStartsAt: result.tenant.subscriptionStartsAt,
          subscriptionExpiresAt: result.tenant.subscriptionExpiresAt,
        },
        owner: result.owner,
      };
    });
  }
}
