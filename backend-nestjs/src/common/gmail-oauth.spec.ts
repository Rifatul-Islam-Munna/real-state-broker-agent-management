import {
  GmailOAuthRefreshError,
  refreshGmailAccessToken,
} from './gmail-oauth';

describe('refreshGmailAccessToken', () => {
  it('refreshes an access token without requiring the user to sign in again', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'access-next',
      expires_in: 3600,
    }), { status: 200 }));

    const result = await refreshGmailAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-long-lived',
      fetchImpl: fetchImpl as any,
    });

    expect(result.accessToken).toBe('access-next');
    expect(result.accessTokenExpiresAt).toBeTruthy();
    expect(result.refreshTokenExpiresAt).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it('marks invalid_grant as a reconnect-required authorization failure', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'invalid_grant',
      error_description: 'Token has been expired or revoked.',
    }), { status: 400 }));

    await expect(refreshGmailAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'expired-refresh',
      fetchImpl: fetchImpl as any,
    })).rejects.toMatchObject({
      name: 'GmailOAuthRefreshError',
      code: 'invalid_grant',
      reconnectRequired: true,
      status: 400,
    });
  });

  it('keeps transient provider failures separate from revoked authorization', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(JSON.stringify({
      error: 'temporarily_unavailable',
    }), { status: 503 }));
    await expect(refreshGmailAccessToken({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      refreshToken: 'refresh-token',
      fetchImpl: fetchImpl as any,
    })).rejects.toMatchObject({
      code: 'temporarily_unavailable',
      reconnectRequired: false,
      status: 503,
    });
  });
});
