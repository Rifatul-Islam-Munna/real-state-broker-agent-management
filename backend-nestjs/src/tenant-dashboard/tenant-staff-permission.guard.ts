import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantUserRole } from '../security/tenant-user-role.enum';

const STAFF_PERMISSIONS = new Set([
  'dashboard',
  'properties',
  'deal-pipeline',
  'lead',
  'mail',
  'settings',
]);

@Injectable()
export class TenantStaffPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (user?.tenantRole !== TenantUserRole.Staff) return true;

    const path = this.cleanPath(request.path ?? request.url ?? '');
    if (path === '/tenant-dashboard/context') return true;

    const required = this.permissionForPath(path);
    const granted = new Set(
      (user.agentRoutePermissions ?? []).filter((item: string) => STAFF_PERMISSIONS.has(item)),
    );
    if (required && granted.has(required)) return true;

    throw new ForbiddenException('Your staff permissions do not allow access to this tenant area.');
  }
  private permissionForPath(path: string): string | null {
    if (path.startsWith('/tenant-chatbot')) {
      if (path.includes('/settings') || path.includes('/knowledge') || path.endsWith('/reindex')) return 'settings';
      return 'lead';
    }
    if (path.startsWith('/tenant-property-operations')) return 'properties';
    if (path.startsWith('/tenant-inbox') || path.startsWith('/tenant-sms-inbox')) return 'mail';
    if (path.startsWith('/tenant-outreach')) return 'lead';
    if (path.startsWith('/tenant-workspace')) {
      if (path.includes('lead-outreach') || path.endsWith('/leads')) return 'lead';
      if (path.endsWith('/deals')) return 'deal-pipeline';
      if (path.includes('homepage-settings') || path.includes('marketing-settings')) return null;
      if (path.includes('agency-settings') || path.includes('/settings/') || path.includes('/scheduling') || path.includes('/integrations')) return 'settings';
      return null;
    }
    if (path.startsWith('/tenant-legacy')) {
      if (path.includes('/properties')) return 'properties';
      if (path.includes('/deals')) return 'deal-pipeline';
      if (path.includes('/dashboard')) return 'dashboard';
      if (path.includes('/mail-inbox') || path.includes('/sms-inbox') || path.includes('/lead-collection-templates')) return 'mail';
      if (path.includes('/leads') || path.includes('/lead-history') || path.includes('/showings') || path.includes('/realtor') || path.includes('/contact-requests') || path.includes('/property-chats') || path.includes('/website-inquiries')) return 'lead';
      if (path.includes('/tools')) return 'dashboard';
      return null;
    }
    if (path.startsWith('/tenant-dashboard')) {
      if (path.includes('/properties')) return 'properties';
      if (path.includes('/leads') || path.includes('/showing') || path.includes('/owner-reports')) return 'lead';
      if (path.includes('/settings')) return 'settings';
      if (path.includes('/overview') || path.endsWith('/showings')) return 'dashboard';
      return 'dashboard';
    }
    return null;
  }

  private cleanPath(path: string) {
    return path.split('?')[0].replace(/^\/api\/?/, '/');
  }
}
