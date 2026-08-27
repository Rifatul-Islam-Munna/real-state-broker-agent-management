export type GmailOAuthRefreshResult = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string | null;
};

export class GmailOAuthRefreshError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly description: string,
    readonly reconnectRequired: boolean,
  ) {
    super(message);
    this.name = 'GmailOAuthRefreshError';
  }
}

export async function refreshGmailAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<GmailOAuthRefreshResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({      client_id: input.clientId,
      client_secret: input.clientSecret,
      refresh_token: input.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const raw = await response.text();
  let payload: any = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const code = text(payload?.error);
    const description = text(payload?.error_description, raw).slice(0, 500);
    const reconnectRequired = code === 'invalid_grant';
    const detail = description || code || `HTTP ${response.status}`;
    const message = reconnectRequired
      ? 'Gmail authorization expired or was revoked. Reconnect Gmail to resume automation.'
      : `Gmail token refresh failed (${detail}).`;
    throw new GmailOAuthRefreshError(
      message,
      response.status,
      code,
      description,
      reconnectRequired,
    );
  }
  const accessToken = text(payload?.access_token);
  if (!accessToken) {
    throw new GmailOAuthRefreshError(
      'Gmail did not return an access token.',
      response.status,
      'missing_access_token',
      '',
      false,
    );
  }
  const expiresIn = positiveSeconds(payload?.expires_in, 3600);
  const refreshExpiresIn = positiveSeconds(payload?.refresh_token_expires_in, 0);
  return {
    accessToken,
    accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    refreshTokenExpiresAt: refreshExpiresIn
      ? new Date(Date.now() + refreshExpiresIn * 1000).toISOString()
      : null,
  };
}

export function isGmailReconnectRequired(error: unknown) {
  return error instanceof GmailOAuthRefreshError && error.reconnectRequired;
}

function positiveSeconds(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function text(value: unknown, fallback = '') {
  const normalized = `${value ?? ''}`.trim();
  return normalized || fallback;
}
