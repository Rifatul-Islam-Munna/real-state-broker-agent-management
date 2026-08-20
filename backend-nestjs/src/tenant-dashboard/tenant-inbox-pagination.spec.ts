import { TenantInboxSyncService } from './tenant-inbox-sync.service';

describe('TenantInboxSyncService paging', () => {
  test('loads every Gmail page even when request size is smaller than backlog', async () => {
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
    const request = jest
      .spyOn(service as any, 'jsonRequest')
      .mockResolvedValueOnce({
        messages: [{ id: 'new-2' }, { id: 'new-1' }],
        nextPageToken: 'page-2',
      })
      .mockResolvedValueOnce({ messages: [{ id: 'old-1' }] });

    await expect(
      (service as any).listGmailMessagesForLabel(
        'access-token',
        'INBOX',
        'gmail',
        2,
        new Date('2026-08-20T00:00:00.000Z').getTime(),
        new Date('2026-08-20T00:05:00.000Z').getTime(),
      ),
    ).resolves.toEqual([
      { id: 'new-2', mailboxTag: 'gmail' },
      { id: 'new-1', mailboxTag: 'gmail' },
      { id: 'old-1', mailboxTag: 'gmail' },
    ]);

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toContain('pageToken=page-2');
  });
});
