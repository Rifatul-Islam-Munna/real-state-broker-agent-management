jest.mock('../showing-feedback/showing-feedback.service', () => ({
  ShowingFeedbackService: class ShowingFeedbackService {},
}));

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

  it('disables stale Gmail sync after a rejected refresh token so cron does not retry forever', async () => {
    const state = makeService({
      providerName: 'Gmail', authType: 'gmail-oauth', enableInboxSync: true,
      syncIntervalMinutes: 5, gmailEmail: 'old@example.com',
      gmailRefreshToken: 'revoked-token', gmailAccessToken: '',
    });
    jest.spyOn(state.service as any, 'syncInbox').mockRejectedValue(new Error('Gmail token refresh failed: 400'));

    await expect((state.service as any).runSync('Scheduled', false)).rejects.toThrow('Gmail token refresh failed: 400');

    expect(state.integrationRepo.save).toHaveBeenCalled();
    const saved = JSON.parse(state.row.smtpPayload);
    expect(saved.enableInboxSync).toBe(false);
    expect(saved.gmailRefreshToken).toBe('');
    expect(saved.gmailAccessToken).toBe('');
  });
});
