import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard tenant API isolation', () => {
  it('allows tenant-isolated chatbot routes', () => {
    const guard = new JwtAuthGuard() as any;

    expect(guard.isTenantSafePath('/tenant-chatbot/settings')).toBe(true);
    expect(guard.isTenantSafePath('/tenant-chatbot/test')).toBe(true);
    expect(guard.isTenantSafePath('/tenant-chatbot/health')).toBe(true);
  });
});
