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

  it('sends connected Gmail messages via the API with the original MIME content', async () => {
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({
        authType: 'gmail-oauth',
        gmailEmail: 'agent@example.com',
        fromEmail: 'agent@example.com',
        gmailAccessToken: 'valid-token',
        gmailTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'gmail-message-123' }), { status: 200 }),
    ) as any;
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const result = await (service as any).sendEmail('tenant_example', {
      recipient_email: 'owner@example.com',
      title: 'Weekly owner report',
      body: 'Hello owner\\nYour report is ready.',
      idempotency_key: 'owner-report-test',
      media_urls: [],
      payload: {},
    }, { id: 7 });

    expect(result.provider).toBe('Gmail API');
    expect(result.providerMessageId).toBe('gmail-message-123');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://gmail.googleapis.com/gmail/v1/users/me/messages/send');
    const mime = Buffer.from(JSON.parse(options.body).raw, 'base64url').toString('utf8');
    expect(mime).toContain('owner@example.com');
    expect(mime).toContain('Weekly owner report');
    expect(mime).toContain('Your report is ready.');
  });

  it('reports Gmail API authorization failures without attempting SMTP delivery', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Insufficient permissions' } }), { status: 403 }),
    ) as any;
    const service = new TenantOutreachDeliveryService({} as any, {} as any);
    await expect((service as any).sendViaGmailApi({
      gmailAccessToken: 'test-token',
    }, {
      from: 'agent@example.com',
      to: 'owner@example.com',
      subject: 'Test',
      text: 'Hello',
    }, 'owner@example.com')).rejects.toThrow('Gmail API send failed (HTTP 403)');
  });

  it('uses password-based SMTP even when old Gmail tokens remain in settings', async () => {
    const transport = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'smtp-message-123',
        accepted: ['owner@example.com'],
        rejected: [],
      }),
      close: jest.fn(),
    };
    const nodemailer = require('nodemailer');
    const createTransport = jest.spyOn(nodemailer, 'createTransport')
      .mockReturnValue(transport as any);
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({
        authType: 'password',
        providerName: 'Custom',
        host: 'smtp.example.com',
        port: 587,
        useSsl: true,
        username: 'agent@example.com',
        password: 'test-password',
        fromEmail: 'agent@example.com',
        gmailRefreshToken: 'old-gmail-token',
      }),
    };
    global.fetch = jest.fn() as any;
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const result = await (service as any).sendEmail('tenant_example', {
      recipient_email: 'owner@example.com',
      title: 'Owner report',
      body: 'Report text',
      idempotency_key: 'smtp-test',
      media_urls: [],
      payload: {},
    }, { id: 7 });

    expect(result.provider).toBe('SMTP');
    expect(result.providerMessageId).toBe('smtp-message-123');
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: 'agent@example.com', pass: 'test-password' },
    }));
    expect(transport.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      subject: 'Owner report',
    }));
    expect(global.fetch).not.toHaveBeenCalled();
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
