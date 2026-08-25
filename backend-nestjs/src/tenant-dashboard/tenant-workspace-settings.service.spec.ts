import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

describe('TenantWorkspaceSettingsService follow-up defaults', () => {
  it('adds missing follow-up slots without overwriting stored tenant templates', async () => {
    const storedLeadOne = {
      id: 'custom-lead-one',
      name: 'My custom lead follow-up 1',
      subject: 'Custom subject',
      body: 'Custom body',
      channels: ['Email'],
      sequenceType: 'FollowUp1',
      audience: 'Lead',
      gapDays: 2,
      isActive: true,
    };
    const query = jest.fn(async () => ({
      rows: [{
        value: {
          communicationTemplates: [storedLeadOne],
        },
        updatedAt: new Date('2026-08-25T00:00:00Z'),
      }],
    }));
    const databases = {
      withTenantClient: jest.fn(async (_name: string, work: any) =>
        work({ query }),
      ),
    };
    const service = new TenantWorkspaceSettingsService(
      databases as any,
      {} as any,
    );
    const tenant = {
      id: 7,
      businessName: 'Blue Realty',
      databaseName: 'tenant_7_blue',
    } as any;

    const settings: any = await service.getAgencySettings(tenant);
    const followUps = settings.communicationTemplates.filter(
      (item: any) => String(item.sequenceType).startsWith('FollowUp'),
    );
    const lead = followUps.filter((item: any) => item.audience === 'Lead');
    const realtor = followUps.filter((item: any) => item.audience === 'Realtor');

    expect(lead.find((item: any) => item.sequenceType === 'FollowUp1')).toEqual(
      expect.objectContaining({ id: 'custom-lead-one', subject: 'Custom subject' }),
    );
    expect(lead.map((item: any) => item.sequenceType)).toEqual(
      expect.arrayContaining(['FollowUp1', 'FollowUp4', 'FollowUp5', 'FollowUp6']),
    );
    expect(realtor.map((item: any) => item.sequenceType)).toEqual(
      expect.arrayContaining(['FollowUp1', 'FollowUp2', 'FollowUp3', 'FollowUp4', 'FollowUp5', 'FollowUp6']),
    );
    expect(lead.filter((item: any) => ['FollowUp4', 'FollowUp5', 'FollowUp6'].includes(item.sequenceType))
      .every((item: any) => item.isActive === false)).toBe(true);
    expect(realtor.every((item: any) => item.isActive === false)).toBe(true);
  });
});
