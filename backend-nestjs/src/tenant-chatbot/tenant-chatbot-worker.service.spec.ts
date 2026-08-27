import { TenantChatbotWorkerService } from './tenant-chatbot-worker.service';

describe('TenantChatbotWorkerService', () => {
  it('claims each incoming email or SMS once before orchestration', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job job')) {
        return {
          rows: [
            {
              id: 501,
              leadId: 7,
              propertyId: 9,
              channel: 'Email',
              body: 'Is parking included?',
              providerMessageId: 'mail-1',
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_processed_inbound')) {
        return { rows: [{ outreach_job_id: 501 }] };
      }
      return { rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn(async (_name: string, work: any) =>
        work({ query }),
      ),
    };
    const chatbot = {
      handleMessage: jest.fn(async () => ({ decision: 'ANSWER' })),
    };
    const worker = new TenantChatbotWorkerService(
      { find: jest.fn(async () => []) } as any,
      databases as any,
      chatbot as any,
    );
    const tenant = { id: 42, databaseName: 'tenant_42', isActive: true } as any;

    await expect(worker.processTenant(tenant)).resolves.toEqual({
      processed: 1,
      failed: 0,
    });
    expect(chatbot.handleMessage).toHaveBeenCalledWith(tenant, {
      channel: 'EMAIL',
      audience: 'LEAD',
      leadId: 7,
      propertyId: 9,
      sessionId: 'email:7',
      idempotencyKey: 'inbound:501',
      body: 'Is parking included?',
      realtorVerified: false,
      requireRoleConfirmation: true,
    });
  });
  it('uses REALTOR audience only for a sender verified in the tenant realtor directory', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job job')) {
        return {
          rows: [
            {
              id: 777,
              leadId: 12,
              propertyId: 44,
              channel: 'Email',
              body: 'What is the lockbox code?',
              providerMessageId: 'mail-777',
              senderEmail: 'agent@broker.com',
              senderPhone: '',
              verifiedRealtor: true,
            },
          ],
        };
      }
      if (sql.includes('INSERT INTO tenant_chatbot_processed_inbound')) {
        return { rows: [{ outreach_job_id: 777 }] };
      }
      return { rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn(async (_name: string, work: any) =>
        work({ query }),
      ),
    };
    const chatbot = {
      handleMessage: jest.fn(async () => ({ decision: 'ANSWER' })),
    };
    const worker = new TenantChatbotWorkerService(
      { find: jest.fn(async () => []) } as any,
      databases as any,
      chatbot as any,
    );
    const tenant = { id: 42, databaseName: 'tenant_42', isActive: true } as any;

    await worker.processTenant(tenant);

    expect(chatbot.handleMessage).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({
        audience: 'REALTOR',
        leadId: 12,
        propertyId: 44,
        realtorVerified: true,
        requireRoleConfirmation: true,
      }),
    );
  });
  it('global worker flag is an emergency kill switch only', async () => {
    const tenants = { find: jest.fn(async () => []) };
    const worker = new TenantChatbotWorkerService(
      tenants as any,
      {} as any,
      {} as any,
    );
    const previous = process.env.TENANT_CHATBOT_WORKER_ENABLED;
    process.env.TENANT_CHATBOT_WORKER_ENABLED = 'false';
    try {
      await worker.processAllTenants();
      expect(tenants.find).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined)
        delete process.env.TENANT_CHATBOT_WORKER_ENABLED;
      else process.env.TENANT_CHATBOT_WORKER_ENABLED = previous;
    }
  });

  it('cleans expired activity for every tenant during the scheduled pass', async () => {
    const tenant = {
      id: 42,
      databaseName: 'tenant_42',
      isActive: true,
      isBlocked: false,
    } as any;
    const chatbot = {
      cleanupExpiredActivity: jest
        .fn()
        .mockResolvedValue({ messagesDeleted: 2, eventsDeleted: 1 }),
    };
    const worker = new TenantChatbotWorkerService(
      { find: jest.fn(async () => [tenant]) } as any,
      {} as any,
      chatbot as any,
    );
    jest.spyOn(worker, 'processTenant').mockResolvedValue({
      processed: 0,
      failed: 0,
    });

    await worker.processAllTenants();

    expect(chatbot.cleanupExpiredActivity).toHaveBeenCalledWith(tenant);
  });
});
