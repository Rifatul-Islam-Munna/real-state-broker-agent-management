import { NotFoundException } from '@nestjs/common';
import { TenantChatbotPublicController } from './tenant-chatbot-public.controller';

describe('TenantChatbotPublicController', () => {
  it('requires a tenant and forces lead/web scope', async () => {
    const chatbot = { handlePublicMessage: jest.fn(async () => ({ decision: 'ANSWER' })) };
    const controller = new TenantChatbotPublicController(chatbot as any);
    const body = {
      accessToken: 'contact-session-token',
      sessionId: 's1',
      idempotencyKey: 'm1',
      body: 'What is the rent?',
      audience: 'REALTOR',
      channel: 'EMAIL',
    } as any;

    await expect(controller.message({ tenant: null }, body))
      .rejects.toBeInstanceOf(NotFoundException);
    const request = { tenant: { id: 42, databaseName: 'tenant_42' } };
    await controller.message(request, body);

    expect(chatbot.handlePublicMessage).toHaveBeenCalledWith(request.tenant, {
      accessToken: 'contact-session-token',
      sessionId: 's1',
      idempotencyKey: 'm1',
      body: 'What is the rent?',
      showing: undefined,
    });
  });
});
