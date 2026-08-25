import { TenantUserRole } from '../security/tenant-user-role.enum';
import { TenantStaffPermissionGuard } from './tenant-staff-permission.guard';

function execution(path: string, permissions: string[], tenantRole = TenantUserRole.Staff) {
  const request: any = { path, url: path, user: { tenantRole, agentRoutePermissions: permissions } };
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('TenantStaffPermissionGuard', () => {
  const guard = new TenantStaffPermissionGuard();

  it('allows owners without applying staff section restrictions', () => {
    expect(guard.canActivate(execution('/api/tenant-dashboard/settings', [], TenantUserRole.Owner))).toBe(true);
  });

  it('allows staff only into granted tenant sections', () => {
    expect(guard.canActivate(execution('/api/tenant-dashboard/properties', ['properties']))).toBe(true);
    expect(guard.canActivate(execution('/api/tenant-inbox', ['mail']))).toBe(true);
    expect(guard.canActivate(execution('/api/tenant-workspace/settings/integrations/workspace', ['settings']))).toBe(true);
  });

  it('blocks direct API access to sections that were not granted', () => {
    expect(() => guard.canActivate(execution('/api/tenant-dashboard/leads', ['properties']))).toThrow('staff permissions');
    expect(() => guard.canActivate(execution('/api/tenant-inbox', ['lead']))).toThrow('staff permissions');
    expect(() => guard.canActivate(execution('/api/tenant-dashboard/settings', []))).toThrow('staff permissions');
  });

  it('keeps owner-only legacy content blocked even when staff has settings', () => {
    expect(() => guard.canActivate(execution('/api/tenant-workspace/homepage-settings', ['settings']))).toThrow('staff permissions');
    expect(() => guard.canActivate(execution('/api/tenant-legacy/resource/documents', ['settings']))).toThrow('staff permissions');
  });

  it('requires settings permission for chatbot settings, knowledge, and reindex routes', () => {
    expect(guard.canActivate(execution('/api/tenant-chatbot/settings', ['settings']))).toBe(true);
    expect(guard.canActivate(execution('/api/tenant-chatbot/knowledge', ['settings']))).toBe(true);
    expect(guard.canActivate(execution('/api/tenant-chatbot/reindex', ['settings']))).toBe(true);
    expect(() => guard.canActivate(execution('/api/tenant-chatbot/reindex', ['lead']))).toThrow('staff permissions');
  });

  it('requires lead permission for chatbot test and lead controls', () => {
    expect(guard.canActivate(execution('/api/tenant-chatbot/test', ['lead']))).toBe(true);
    expect(guard.canActivate(execution('/api/tenant-chatbot/leads/42/activity', ['lead']))).toBe(true);
    expect(() => guard.canActivate(execution('/api/tenant-chatbot/test', ['settings']))).toThrow('staff permissions');
  });

  it('allows the minimal tenant context needed to render permitted navigation', () => {
    expect(guard.canActivate(execution('/api/tenant-dashboard/context', []))).toBe(true);
  });
});
