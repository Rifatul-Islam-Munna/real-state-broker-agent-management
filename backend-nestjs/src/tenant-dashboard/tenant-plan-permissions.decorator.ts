import { SetMetadata } from '@nestjs/common';

export const TENANT_PLAN_PERMISSIONS_KEY = 'tenantPlanPermissions';
export const TenantPlanPermissions = (...permissions: string[]) => SetMetadata(TENANT_PLAN_PERMISSIONS_KEY, permissions);
