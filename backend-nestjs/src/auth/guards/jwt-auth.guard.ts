import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activated = await (super.canActivate(context) as
      | Promise<boolean>
      | boolean);
    if (!activated) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;

    const role = String(user.role);
    const path = this.cleanPath(request.path ?? request.url ?? '');
    const method = String(request.method ?? 'GET').toUpperCase();
    if (this.isTenantUser(user) && !this.isTenantSafePath(path)) {
      throw new ForbiddenException(
        'Tenant accounts can only use tenant-isolated APIs. Shared application routes are blocked.',
      );
    }
    if (!['Admin', 'Agent'].includes(role) && path !== '/auth/me') {
      throw new ForbiddenException('You do not have access to this area.');
    }
    if (this.isAdminOnly(path, method) && role !== 'Admin') {
      throw new ForbiddenException('Administrator access is required.');
    }
    if (role !== 'Agent') return true;

    const permission = this.permissionForPath(path);
    if (!permission) return true;
    if ((user.agentRoutePermissions ?? []).includes(permission)) return true;

    throw new ForbiddenException('You do not have access to this area.');
  }

  private isTenantUser(user: any) {
    return (
      Number.isInteger(Number(user?.tenantId)) && Number(user.tenantId) > 0
    );
  }

  private isTenantSafePath(path: string) {
    return (
      path === '/auth/me' ||
      path.startsWith('/tenant-account') ||
      path.startsWith('/tenant-dashboard') ||
      path.startsWith('/tenant-staff') ||
      path.startsWith('/tenant-property-operations') ||
      path.startsWith('/tenant-subscription') ||
      path.startsWith('/tenant-domain') ||
      path.startsWith('/tenant-tracking') ||
      path.startsWith('/tenant-workspace') ||
      path.startsWith('/tenant-legacy') ||
      path.startsWith('/tenant-outreach') ||
      path.startsWith('/tenant-inbox') ||
      path.startsWith('/tenant-sms-inbox') ||
      path.startsWith('/tenant-chatbot')
    );
  }

  private permissionForPath(path: string): string | null {
    if (path.startsWith('/properties')) return 'properties';
    if (
      path.startsWith('/leads') ||
      path.startsWith('/lead-history') ||
      path.startsWith('/lead-outreach') ||
      path.startsWith('/showings') ||
      path.startsWith('/realtor-showings') ||
      path.startsWith('/showing-feedback') ||
      path.startsWith('/website-inquiries') ||
      path.startsWith('/contact-requests') ||
      path.startsWith('/property-chat') ||
      path.startsWith('/text-messages') ||
      path.startsWith('/sms')
    ) {
      return 'lead';
    }
    if (path.startsWith('/deals')) return 'deal-pipeline';
    if (path.startsWith('/mail-inbox')) return 'mail';
    if (path.startsWith('/dashboard') || path.startsWith('/reports'))
      return 'dashboard';
    if (
      path.startsWith('/agency-settings') ||
      path.startsWith('/settings') ||
      path.startsWith('/homepage-settings') ||
      path.startsWith('/marketing-settings')
    ) {
      return 'settings';
    }
    return null;
  }

  private isAdminOnly(path: string, method: string) {
    if (path.startsWith('/super-admin-management')) return true;
    if (path.startsWith('/property-operations')) return true;
    if (
      path.startsWith('/agency-settings') ||
      path.startsWith('/settings/integrations') ||
      path.startsWith('/settings/scheduling') ||
      path.startsWith('/homepage-settings') ||
      path.startsWith('/marketing-settings')
    ) {
      return true;
    }
    if (
      path.startsWith('/brokerage/approvals') ||
      path.startsWith('/lead-assignment-rules')
    )
      return true;
    if (path.startsWith('/documents')) return true;
    if (
      path === '/blogs/admin' ||
      (path.startsWith('/blogs') && method !== 'GET')
    )
      return true;
    if (path.startsWith('/users/agents') && method !== 'GET') return true;
    return false;
  }

  private cleanPath(path: string) {
    return path.split('?')[0].replace(/^\/api\/?/, '/');
  }
}
