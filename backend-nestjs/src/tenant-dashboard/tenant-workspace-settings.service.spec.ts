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
