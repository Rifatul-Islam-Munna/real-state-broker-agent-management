import { TenantChatbotController } from './tenant-chatbot.controller';

describe('TenantChatbotController', () => {
  const tenant = { id: 4, databaseName: 'tenant_4_test' };
  const request = { tenant, user: { userId: 9 } } as any;

  it('keeps test mode side-effect free by delegating only to testQuestion', async () => {
    const service = {
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      createKnowledge: jest.fn(),
      testQuestion: jest.fn().mockResolvedValue({ decision: 'ANSWER' }),
    };
    const controller = new TenantChatbotController(service as any);

    await expect(
      controller.test(request, {
        audience: 'LEAD',
        question: 'Is parking included?',
      }),
    ).resolves.toEqual({ decision: 'ANSWER' });

    expect(service.testQuestion).toHaveBeenCalledWith(tenant, {
      audience: 'LEAD',
      question: 'Is parking included?',
    });
    expect(service.createKnowledge).not.toHaveBeenCalled();
  });

  it('passes the authenticated actor to settings and knowledge writes', async () => {
    const service = {
      getSettings: jest.fn(),
      testQuestion: jest.fn(),
      updateSettings: jest.fn().mockResolvedValue({ enabled: true }),
      createKnowledge: jest.fn().mockResolvedValue({ id: '2' }),
      updateKnowledge: jest.fn().mockResolvedValue({ id: '2' }),
    };
    const controller = new TenantChatbotController(service as any);

    await controller.updateSettings(request, { enabled: true });
    await controller.createKnowledge(request, {
      audience: 'LEAD',
      title: 'Parking',
      answer: 'One space is included.',
    });
    await controller.updateKnowledge(request, '2', {
      answer: 'Two spaces are included.',
    });

    expect(service.updateSettings).toHaveBeenCalledWith(
      tenant,
      { enabled: true },
      9,
    );
    expect(service.createKnowledge).toHaveBeenCalledWith(
      tenant,
      expect.objectContaining({ title: 'Parking' }),
      9,
    );
    expect(service.updateKnowledge).toHaveBeenCalledWith(
      tenant,
      2,
      { answer: 'Two spaces are included.' },
      9,
    );
  });

  it('lists tenant knowledge without performing a write', async () => {
    const service = {
      listKnowledge: jest.fn().mockResolvedValue([{ id: '1' }]),
    };
    const controller = new TenantChatbotController(service as any);

    await expect(controller.knowledge(request)).resolves.toEqual([{ id: '1' }]);
    expect(service.listKnowledge).toHaveBeenCalledWith(tenant);
  });

  it('delegates lead activity and manual stop controls with the authenticated actor', async () => {
    const service = {
      listLeadActivity: jest.fn().mockResolvedValue([]),
      stopLead: jest.fn().mockResolvedValue({ stopped: true }),
      resumeLead: jest.fn().mockResolvedValue({ resumed: true }),
    };
    const controller = new TenantChatbotController(service as any);

    await controller.activity(request, '70');
    await controller.stop(request, '70');
    await controller.resume(request, '70');

    expect(service.listLeadActivity).toHaveBeenCalledWith(tenant, 70);
    expect(service.stopLead).toHaveBeenCalledWith(tenant, 70, 9);
    expect(service.resumeLead).toHaveBeenCalledWith(tenant, 70, 9);
  });
});
