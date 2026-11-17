import { TenantWorkspaceSettingsService } from './tenant-workspace-settings.service';

describe('TenantWorkspaceSettingsService email signatures', () => {
  const originalFetch = global.fetch;
  const tenant = { id: 7, databaseName: 'tenant_7_blue' } as any;
  const config = {
    authType: 'gmail-oauth', fromEmail: 'agent@example.com', gmailEmail: 'agent@example.com',
    gmailAccessToken: 'valid-token', gmailRefreshToken: 'long-lived-refresh',
    gmailClientId: 'client-id', gmailClientSecret: 'client-secret',
    gmailTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  };

  afterEach(() => { global.fetch = originalFetch; jest.restoreAllMocks(); });

  function setup(override = {}) {
    const service = new TenantWorkspaceSettingsService({} as any, {} as any);
    jest.spyOn(service, 'getRawSmtp').mockResolvedValue({ ...config, ...override });
    const save = jest.spyOn(service, 'saveRawSmtp').mockResolvedValue(undefined);
    return { service, save };
  }

  it('imports the matching sender signature without changing Gmail or saved signature settings', async () => {
    const { service, save } = setup();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ sendAs: [
      { sendAsEmail: 'other@example.com', isDefault: true, signature: '<b>Wrong sender</b>' },
      { sendAsEmail: 'agent@example.com', signature: '<b onclick="alert(1)">Agent</b><br><img src="https://example.com/logo.png" width="250">' },
    ] }), { status: 200 })) as any;
    const result = await service.getGmailSignature(tenant);
    expect(result.email).toBe('agent@example.com');
    expect(result.html).toContain('<b>Agent</b>');
    expect(result.html).toContain('src="https://example.com/logo.png"');
    expect(result.html).not.toContain('onclick');
    expect(result.text).toBe('Agent\n');
    expect(global.fetch).toHaveBeenCalledWith('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs', expect.objectContaining({ headers: { Authorization: 'Bearer valid-token' } }));
    expect(save).not.toHaveBeenCalled();
  });

  it('uses the sender selected in the form when it is a Gmail alias', async () => {
    const { service } = setup();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ sendAs: [
      { sendAsEmail: 'agent@example.com', signature: '<b>Primary</b>' },
      { sendAsEmail: 'alias@example.com', signature: '<b>Alias</b>' },
    ] }), { status: 200 })) as any;
    expect(await service.getGmailSignature(tenant, { fromEmail: 'ALIAS@example.com' }))
      .toEqual({ html: '<b>Alias</b>', text: 'Alias', email: 'alias@example.com' });
  });

  it('refreshes an expired token before importing while keeping the refresh token', async () => {
    const { service, save } = setup({ gmailTokenExpiresAt: '2020-01-01T00:00:00Z' });
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'fresh-token', expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ sendAs: [{ sendAsEmail: 'agent@example.com', signature: '<b>Agent</b>' }] }), { status: 200 })) as any;
    await service.getGmailSignature(tenant);
    expect(save).toHaveBeenCalledWith(tenant, expect.objectContaining({ gmailRefreshToken: 'long-lived-refresh', gmailAccessToken: 'fresh-token' }));
    expect((global.fetch as jest.Mock).mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('explains missing Gmail permissions without saving an empty signature', async () => {
    const { service, save } = setup();
    global.fetch = jest.fn().mockResolvedValue(new Response('{}', { status: 403 })) as any;
    await expect(service.getGmailSignature(tenant)).rejects.toThrow('Reconnect Gmail');
    expect(save).not.toHaveBeenCalled();
  });

  it('does not substitute another sender signature when the selected sender has none', async () => {
    const { service } = setup();
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ sendAs: [
      { sendAsEmail: 'agent@example.com', signature: '' },
      { sendAsEmail: 'other@example.com', signature: '<b>Other</b>' },
    ] }), { status: 200 })) as any;
    await expect(service.getGmailSignature(tenant)).rejects.toThrow('No Gmail signature found');
  });

  it('sanitizes signature HTML before persisting integration settings', async () => {
    const { service } = setup();
    jest.spyOn(service as any, 'getSetting').mockResolvedValue({ value: { smtp: config } });
    const write = jest.spyOn(service as any, 'setSetting').mockResolvedValue(undefined);
    jest.spyOn(service, 'getIntegrations').mockResolvedValue({} as any);
    await service.updateIntegrations(tenant, { smtp: {
      emailSignatureEnabled: true,
      emailSignatureHtml: '<b onclick=alert(1)>Agent</b><script>alert(1)</script>',
    } });
    expect(write).toHaveBeenCalledWith(tenant, 'workspace_integrations', expect.objectContaining({ smtp: expect.objectContaining({
      emailSignatureEnabled: true, emailSignatureHtml: '<b>Agent</b>', emailSignatureText: 'Agent',
    }) }));
  });
});

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

describe('TenantWorkspaceSettingsService Gmail OAuth', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalRedirect = process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI = originalRedirect;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('requests offline access with explicit consent for background Gmail automation', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI = 'https://api.example.com/api/tenant-workspace-public/integrations/gmail/callback';
    const service = new TenantWorkspaceSettingsService({} as any, {} as any);

    const result = await service.getGmailConnectUrl({ id: 7, subdomain: 'blue' } as any);
    const url = new URL(result.url);

    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('include_granted_scopes')).toBe('true');
    expect(url.searchParams.get('scope')).toContain('gmail.modify');
    expect(url.searchParams.get('scope')).toContain('gmail.send');
  });
});

describe('TenantWorkspaceSettingsService Gmail reconnect', () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalRedirect = process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
    process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
    process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI = originalRedirect;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('keeps an existing refresh token when Google omits a new one and clears reconnect state', async () => {
    process.env.GOOGLE_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_TENANT_GMAIL_REDIRECT_URI = 'https://api.example.com/callback';
    const tenant = {
      id: 7,
      subdomain: 'blue',
      databaseName: 'tenant_7_blue',
      databaseStatus: 'ready',
      provisioningStatus: 'ready',
      isActive: true,
      isBlocked: false,
    } as any;
    const service = new TenantWorkspaceSettingsService(
      {} as any,
      { findOne: jest.fn().mockResolvedValue(tenant) } as any,
    );
    jest.spyOn(service as any, 'getRawSmtp').mockResolvedValue({
      gmailEmail: 'agent@example.com',
      gmailRefreshToken: 'long-lived-refresh',
      gmailReconnectRequired: true,
      gmailLastAuthError: 'old auth failure',
    });
    const save = jest.spyOn(service as any, 'saveRawSmtp').mockResolvedValue(undefined);
    const state = (service as any).signOauthState({
      version: 1,
      tenantId: 7,
      subdomain: 'blue',
      returnTo: '/dashboard/settings',
      returnOrigin: '',
      mailboxTag: 'Leads',
      leadTemplateTags: [],
      localInboxRetentionDays: 0,
      expiresAt: Date.now() + 60_000,
      nonce: 'test-nonce',
    });
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        access_token: 'new-access',
        expires_in: 3600,
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        email: 'agent@example.com',
        name: 'Agent',
      }), { status: 200 })) as any;
    await service.completeGmailConnect('auth-code', state);

    expect(save).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        gmailEmail: 'agent@example.com',
        gmailRefreshToken: 'long-lived-refresh',
        gmailAccessToken: 'new-access',
        gmailReconnectRequired: false,
        gmailLastAuthError: '',
        gmailAuthFailedAt: null,
        enableInboxSync: true,
      }),
    );
  });
});
