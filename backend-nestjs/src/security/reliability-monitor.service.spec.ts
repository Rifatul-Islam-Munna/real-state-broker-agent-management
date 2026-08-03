import { ReliabilityMonitorService } from './reliability-monitor.service';

describe('ReliabilityMonitorService', () => {
  it('tracks successful and failed reliability events without exposing secrets', () => {
    const monitor = new ReliabilityMonitorService();
    monitor.record('tenant.database.connected', { tenantId: 7 });
    monitor.failure('tenant.database.connection.failed', new Error('connection refused'), { tenantId: 8 });
    monitor.record('tenant.subscription.job.succeeded', { tenantId: 7 });

    expect(monitor.snapshot()).toEqual({
      'tenant.database.connected': 1,
      'tenant.database.connection.failed': 1,
      'tenant.subscription.job.succeeded': 1,
    });
  });
});
