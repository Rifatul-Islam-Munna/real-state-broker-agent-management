import { TenantOutreachService } from '../tenant-dashboard/tenant-outreach.service';

describe('tenant chatbot outreach delivery gate', () => {
  it('does not call the provider after the chatbot authorization gate cancels', async () => {
    const databases = {
      withTenantClient: jest.fn(),
    };
    const delivery = {
      sendEmail: jest.fn(),
      sendSms: jest.fn(),
    };
    const authorizer = {
      authorizeOutboundJob: jest.fn().mockResolvedValue({
        allowed: false,
        reason: 'HUMAN_INTERVENED',
      }),
    };
    const outreach = new TenantOutreachService(
      databases as any,
      undefined,
      delivery as any,
      authorizer as any,
    );
    const tenant = {
      id: 42,
      databaseName: 'tenant_42_alpha',
    } as any;

    const job = {
      id: 10,
      source_type: 'tenant-chatbot',
      source_id: '31',
      lead_id: 70,
      channel: 'Email',
      status: 'processing',
    } as any;

    await expect(outreach.processClaimedJob(tenant, job)).resolves.toEqual({
      id: 10,
      status: 'cancelled',
      reason: 'HUMAN_INTERVENED',
    });

    expect(authorizer.authorizeOutboundJob).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        id: 10,
        lead_id: 70,
        source_type: 'tenant-chatbot',
        source_id: '31',
      }),
    );
    expect(delivery.sendEmail).not.toHaveBeenCalled();
    expect(delivery.sendSms).not.toHaveBeenCalled();
    expect(databases.withTenantClient).not.toHaveBeenCalled();
  });
});
