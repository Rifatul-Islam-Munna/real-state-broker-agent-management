import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

describe('TenantWorkspaceSettingsService template deletion', () => {
  it('respects the exact stored template array and does not resurrect deleted defaults', async () => {
    const storedLeadOne = {
      id: 'custom-lead-one', name: 'My custom lead follow-up 1', subject: 'Custom subject',
      body: 'Custom body', channels: ['Email'], sequenceType: 'FollowUp1',
      audience: 'Lead', gapDays: 2, isActive: true,
    };
    const query = jest.fn(async () => ({ rows: [{ value: { communicationTemplates: [storedLeadOne] }, updatedAt: new Date('2026-08-25T00:00:00Z') }] }));
    const databases = { withTenantClient: jest.fn(async (_name: string, work: any) => work({ query })) };
    const service = new TenantWorkspaceSettingsService(databases as any, {} as any);
    const tenant = { id: 7, businessName: 'Blue Realty', databaseName: 'tenant_7_blue' } as any;

    const settings: any = await service.getAgencySettings(tenant);

    expect(settings.communicationTemplates).toEqual([storedLeadOne]);
  });
});
