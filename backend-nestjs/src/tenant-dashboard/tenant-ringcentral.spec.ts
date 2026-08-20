import { TenantOutreachDeliveryService } from './tenant-outreach-delivery.service';
import { TenantSmsInboxService } from './tenant-sms-inbox.service';

const mockLogin = jest.fn();
const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPut = jest.fn();
const mockPlatform = {
  login: mockLogin,
  post: mockPost,
  get: mockGet,
  put: mockPut,
};
const mockSdk = jest.fn().mockImplementation(() => ({
  platform: () => mockPlatform,
}));

jest.mock('@ringcentral/sdk', () => ({ SDK: mockSdk }));

const config = {
  providerName: 'RingCentral',
  accountId: 'client-id',
  clientSecret: 'client-secret',
  authToken: 'user-jwt',
  fromNumber: '+15550000001',
  baseUrl: 'https://platform.ringcentral.com',
};

describe('tenant RingCentral integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue(undefined);
  });

  test('uses client credentials and JWT when sending SMS', async () => {
    mockPost.mockResolvedValue({ json: async () => ({ id: 'rc-message-1' }) });
    const settings = { getRawCommunication: jest.fn().mockResolvedValue(config) };
    const service = new TenantOutreachDeliveryService({} as any, settings as any);

    await expect(service.deliver('tenant_db', {
      channel: 'SMS',
      recipient_phone: '+15550000002',
      body: 'Hello',
      idempotency_key: 'job-1',
      media_urls: [],
    } as any, {} as any)).resolves.toEqual({ providerMessageId: 'rc-message-1' });

    expect(mockSdk).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 'client-id',
      clientSecret: 'client-secret',
    }));
    expect(mockLogin).toHaveBeenCalledWith({ jwt: 'user-jwt' });
  });

  test('polls messages without changing RingCentral read status', async () => {
    mockGet
      .mockResolvedValueOnce({
        json: async () => ({
          records: [{ id: 7, readStatus: 'Unread' }],
          paging: { totalPages: 2 },
        }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          records: [{ id: 8, readStatus: 'Read' }],
          paging: { totalPages: 2 },
        }),
      });
    const service = new TenantSmsInboxService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    const since = new Date('2026-08-20T00:00:00.000Z');
    const until = new Date('2026-08-20T00:05:00.000Z');

    await expect((service as any).fetchRingCentral(config, since, until, 25))
      .resolves.toEqual([
        { id: 7, readStatus: 'Unread' },
        { id: 8, readStatus: 'Read' },
      ]);
    expect(mockLogin).toHaveBeenCalledWith({ jwt: 'user-jwt' });
    expect(mockGet).toHaveBeenNthCalledWith(
      1,
      '/restapi/v1.0/account/~/extension/~/message-store',
      {
        dateFrom: '2026-08-20T00:00:00.000Z',
        dateTo: '2026-08-20T00:05:00.000Z',
        messageType: 'SMS',
        page: 1,
        perPage: 25,
      },
    );
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockPut).not.toHaveBeenCalled();
  });
});
