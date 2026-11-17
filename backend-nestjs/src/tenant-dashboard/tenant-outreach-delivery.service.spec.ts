import { TenantOutreachDeliveryService } from './tenant-outreach-delivery.service';
import { simpleParser } from 'mailparser';

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
      body: '\n  Hello owner,\n\nYour report is ready.  [ 3 ] Inquiries\n\tRepairs & maintenance <pending>\n\nBest regards,\n\nStaff  \n',
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
    const parsed = await simpleParser(Buffer.from(JSON.parse(options.body).raw, 'base64url'));
    expect(parsed.text?.replace(/\r\n/g, '\n')).toBe(
      '\n  Hello owner,\n\nYour report is ready.  [ 3 ] Inquiries\n\tRepairs & maintenance <pending>\n\nBest regards,\n\nStaff  \n',
    );
    expect(parsed.html).toContain(
      '<div style="white-space:pre-wrap;font-family:Arial,sans-serif"><br>  Hello owner,<br><br>Your report is ready.  [ 3 ] Inquiries<br>\tRepairs &amp; maintenance &lt;pending&gt;<br><br>Best regards,<br><br>Staff  <br></div>',
    );
  });

  it.each([
    { propertyTitle: '2500 Parkview Dr Unit#1216' },
    {},
  ])('uses neutral address anchors and keeps plain-text MIME exact: %j', async (payload) => {
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({
        authType: 'gmail-oauth', fromEmail: 'agent@example.com',
        gmailAccessToken: 'valid-token',
        gmailTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        emailSignatureEnabled: true,
        emailSignatureHtml: '<a href="mailto:agent@example.com">Agent</a>',
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'plain-address-report' }), { status: 200 })) as any;
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const body = 'Hello owner,\n\n2500 Parkview Dr Unit#1216\n\n  [ 3 ] Inquiries\nContact agent@example.com or https://example.com.\n';
    await (service as any).sendEmail('tenant_example', {
      recipient_email: 'owner@example.com', title: 'Report: 2500 Parkview Dr Unit#1216', body,
      idempotency_key: 'plain-address-report', media_urls: [], payload,
    }, { id: 7 });

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    const parsed = await simpleParser(Buffer.from(JSON.parse(options.body).raw, 'base64url'));
    expect(parsed.subject).toBe('Report: 2500 Parkview Dr Unit#1216');
    expect(parsed.text?.replace(/\r\n/g, '\n')).toBe(body + '\n\nAgent [agent@example.com]');
    const html = String(parsed.html);
    expect(html).toContain('class="owner-report-address"><a href="#"');
    expect(html).toContain('color:inherit !important;text-decoration:none !important;pointer-events:none !important');
    expect(html.replace(/<[^>]+>/g, '')).toContain('2500 Parkview Dr Unit#1216');
    expect(html).not.toMatch(/&#8204;|\u200c/);
    expect(html).toContain('.owner-report-address a{color:inherit !important;');
    expect(html).toContain('content="address=no"');
    expect(html).not.toMatch(/google\.com\/maps|maps\.google/);
    expect(html).toContain('agent@example.com or https://example.com.');
    expect(html).toContain('<a href="mailto:agent@example.com">Agent</a>');
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

  it('embeds an uploaded signature logo inline in Gmail MIME and keeps the report body intact', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aHZkAAAAASUVORK5CYII=', 'base64');
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({
        authType: 'gmail-oauth',
        fromEmail: 'agent@example.com',
        gmailAccessToken: 'valid-token',
        gmailTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
        emailSignatureEnabled: true,
        emailSignatureHtml: '<b>Agent Name</b><br><i>Licensed Real Estate Agent</i>',
        emailSignatureImageUrl: `data:image/png;base64,${png.toString('base64')}`,
      }),
    };
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'signed-email' }), { status: 200 })) as any;
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const body = 'Hello owner,\n\n  [ 3 ] Inquiries\n\n';
    await (service as any).sendEmail('tenant_example', {
      recipient_email: 'owner@example.com', title: 'Report', body,
      idempotency_key: 'signed-report', media_urls: [], payload: {},
    }, { id: 7 });

    const options = (global.fetch as jest.Mock).mock.calls[0][1];
    const parsed = await simpleParser(Buffer.from(JSON.parse(options.body).raw, 'base64url'), { skipImageLinks: true });
    expect(parsed.text?.replace(/\r\n/g, '\n')).toBe(`${body}\n\nAgent Name\nLicensed Real Estate Agent`);
    expect(parsed.html).toContain('<b>Agent Name</b><br /><i>Licensed Real Estate Agent</i>');
    expect(parsed.html).toContain('  [ 3 ] Inquiries<br><br>');
    expect(parsed.html).toContain('src="cid:');
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.attachments[0].contentDisposition).toBe('inline');
    expect(parsed.attachments[0].contentType).toBe('image/png');
    expect(parsed.attachments[0].content).toEqual(png);
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
        emailSignatureEnabled: true,
        emailSignatureText: 'Agent & Team\nLicensed Agent',
      }),
    };
    global.fetch = jest.fn() as any;
    const service = new TenantOutreachDeliveryService({} as any, settings as any);
    const result = await (service as any).sendEmail('tenant_example', {
      recipient_email: 'owner@example.com',
      title: 'Owner report',
      body: '  Report text\r\n\r\n[ 3 ] Inquiries  \rNext line\n\tStaff\n',
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
      text: '  Report text\r\n\r\n[ 3 ] Inquiries  \rNext line\n\tStaff\n\n\nAgent & Team\nLicensed Agent',
      html: expect.stringContaining('<div style="white-space:pre-wrap;font-family:Arial,sans-serif">  Report text<br><br>[ 3 ] Inquiries  <br>Next line<br>\tStaff<br></div><br><br><div data-email-signature="true"><div style="white-space:pre-wrap">Agent &amp; Team<br>Licensed Agent</div></div>'),
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
