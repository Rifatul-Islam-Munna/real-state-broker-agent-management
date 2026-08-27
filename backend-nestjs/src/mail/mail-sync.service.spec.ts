jest.mock('../showing-feedback/showing-feedback.service', () => ({
  ShowingFeedbackService: class ShowingFeedbackService {},
}));

import { GmailOAuthRefreshError } from '../common/gmail-oauth';
import { MailInboxSyncBackgroundService } from './mail-sync.service';

describe('MailInboxSyncBackgroundService Gmail disconnect handling', () => {
  function makeService(smtp: Record<string, unknown> | null) {
    const row: any = { id: 1, smtpPayload: smtp ? JSON.stringify(smtp) : null, aiProviderPayload: null };
    const integrationRepo = {
      findOne: jest.fn(async () => row),
      save: jest.fn(async (value) => value),
    };
    const service = new MailInboxSyncBackgroundService(
      integrationRepo as any,
      { find: jest.fn(async () => []) } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, integrationRepo, row };
  }

  it('skips scheduled Gmail sync when the OAuth connection is no longer present', async () => {
    const state = makeService({
      authType: 'gmail-oauth', enableInboxSync: true, syncIntervalMinutes: 5,
      gmailEmail: '', gmailRefreshToken: '', gmailAccessToken: '',
    });
    const syncInbox = jest.spyOn(state.service as any, 'syncInbox');

    await (state.service as any).runSync('Scheduled', false);

    expect(syncInbox).not.toHaveBeenCalled();
  });

  it('pauses stale Gmail sync without erasing the refresh token after authorization is revoked', async () => {
    const state = makeService({
      providerName: 'Gmail', authType: 'gmail-oauth', enableInboxSync: true,
      syncIntervalMinutes: 5, gmailEmail: 'old@example.com',
      gmailRefreshToken: 'revoked-token', gmailAccessToken: '',
    });
    const error = new GmailOAuthRefreshError(
      'Gmail authorization expired or was revoked. Reconnect Gmail to resume automation.',
      400,
      'invalid_grant',
      'Token has been expired or revoked.',
      true,
    );
    jest.spyOn(state.service as any, 'syncInbox').mockRejectedValue(error);

    await expect((state.service as any).runSync('Scheduled', false)).rejects.toThrow('Reconnect Gmail');

    expect(state.integrationRepo.save).toHaveBeenCalled();
    const saved = JSON.parse(state.row.smtpPayload);
    expect(saved.enableInboxSync).toBe(false);
    expect(saved.gmailRefreshToken).toBe('revoked-token');
    expect(saved.gmailEmail).toBe('old@example.com');
    expect(saved.gmailAccessToken).toBe('');
    expect(saved.gmailReconnectRequired).toBe(true);
    expect(saved.gmailLastAuthError).toContain('Reconnect Gmail');
  });
});
