import { Repository } from 'typeorm';
import { AgencyIntegrationSettings } from './entities/integration-settings.entity';
import { IntegrationWorkspaceService } from './integration-workspace.service';

describe('IntegrationWorkspaceService', () => {
  let row: AgencyIntegrationSettings;
  let service: IntegrationWorkspaceService;

  beforeEach(() => {
    row = {
      id: 1,
      twilioPayload: JSON.stringify({
        providerName: 'Twilio',
        accountId: 'account-1',
        authToken: 'saved-token',
        fromNumber: '+15550100',
        supportsSms: true,
      }),
      twilioUpdatedAt: new Date('2026-07-01T00:00:00Z'),
      smtpPayload: null,
      smtpUpdatedAt: null,
      aiProviderPayload: null,
      aiProviderUpdatedAt: null,
      createdAt: new Date('2026-07-01T00:00:00Z'),
      updatedAt: new Date('2026-07-01T00:00:00Z'),
    };

    const repository = {
      findOne: jest.fn(async () => row),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => {
        row = {
          ...row,
          ...value,
          updatedAt: new Date('2026-07-03T00:00:00Z'),
        };
        return row;
      }),
    } as unknown as Repository<AgencyIntegrationSettings>;

    service = new IntegrationWorkspaceService(repository);
  });

  test('keeps a saved token when the update sends a blank token', async () => {
    await service.update({
      communication: {
        providerName: 'Twilio',
        accountId: 'account-1',
        authToken: '',
        fromNumber: '+15550200',
        supportsSms: true,
      },
    });

    const saved = JSON.parse(row.twilioPayload ?? '{}');
    expect(saved.authToken).toBe('saved-token');
    expect(saved.fromNumber).toBe('+15550200');
  });

  test('returns a secret flag but never returns the secret', async () => {
    const status = await service.getStatus();
    expect(status.communicationConfig.hasAuthToken).toBe(true);
    expect(status.communicationConfig.authToken).toBeUndefined();
    expect(status.hasCommunicationConfig).toBe(true);
  });

  test('rejects a new incomplete communication configuration', async () => {
    row.twilioPayload = null;
    await expect(
      service.update({
        communication: {
          providerName: 'Twilio',
          accountId: 'account-1',
          authToken: '',
          fromNumber: '+15550100',
        },
      }),
    ).rejects.toThrow('auth token');
  });

  test('uses the SMTP login for IMAP when separate values are blank', async () => {
    await service.update({
      smtp: {
        providerName: 'Gmail',
        host: 'smtp.gmail.com',
        port: 587,
        username: 'agent@example.com',
        password: 'app-password',
        fromEmail: 'agent@example.com',
        enableInboxSync: true,
        imapHost: 'imap.gmail.com',
        imapUsername: '',
        imapPassword: '',
      },
    });

    const saved = JSON.parse(row.smtpPayload ?? '{}');
    expect(saved.imapUsername).toBe('agent@example.com');
    expect(saved.imapPassword).toBe('app-password');
  });
});
