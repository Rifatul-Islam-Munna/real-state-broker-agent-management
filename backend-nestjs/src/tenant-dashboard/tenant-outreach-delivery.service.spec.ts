import { TenantOutreachDeliveryService } from './tenant-outreach-delivery.service';

describe('TenantOutreachDeliveryService Gmail OAuth', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('refreshes an expired access token before unattended email delivery', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'fresh-access',
      expires_in: 3600,
    }), { status: 200 })) as any;
    const settings = { saveRawSmtp: jest.fn().mockResolvedValue(undefined) };
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const config: any = {
      gmailRefreshToken: 'long-lived-refresh',
      gmailTokenExpiresAt: '2020-01-01T00:00:00.000Z',
    };
    const result = await (service as any).ensureTenantGmailAccessToken(
      { id: 7 } as any,
      config,
    );

    expect(result.gmailAccessToken).toBe('fresh-access');
    expect(result.gmailReconnectRequired).toBe(false);
    expect(settings.saveRawSmtp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        gmailAccessToken: 'fresh-access',
        gmailRefreshToken: 'long-lived-refresh',
        gmailReconnectRequired: false,
      }),
    );
  });

  it('preserves the refresh token and stops delivery when Google revokes authorization', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'invalid_grant',
      error_description: 'Token has been expired or revoked.',
    }), { status: 400 })) as any;
    const settings = { saveRawSmtp: jest.fn().mockResolvedValue(undefined) };
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const config: any = {
      enableInboxSync: true,
      gmailEmail: 'agent@example.com',
      gmailRefreshToken: 'refresh-token-to-preserve',
      gmailTokenExpiresAt: '2020-01-01T00:00:00.000Z',
    };

    await expect((service as any).ensureTenantGmailAccessToken(
      { id: 7 } as any,
      config,
    )).rejects.toThrow('Reconnect Gmail');

    expect(settings.saveRawSmtp).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        enableInboxSync: false,
        gmailEmail: 'agent@example.com',
        gmailRefreshToken: 'refresh-token-to-preserve',
        gmailReconnectRequired: true,
        gmailAccessToken: '',
      }),
    );
  });
});
