import { LeadOutreachService } from './lead-outreach.service';

describe('LeadOutreachService', () => {
  test('allows Lead Intake SMS and queues active follow-up templates', async () => {
    const lead: any = { id: 1, name: 'Client', email: '', phone: '+15550100', property: '402 Lake View', stage: 'Contacted', inBoard: true };
    const saved: any[] = [];
    const builder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getExists: jest.fn(async () => false),
    };
    const leadRepo: any = { findOne: jest.fn(async () => lead), save: jest.fn(async (value) => value), find: jest.fn(async () => []) };
    const historyRepo: any = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => { saved.push(value); return { id: saved.length, createdAt: new Date(), updatedAt: new Date(), ...value }; }),
      createQueryBuilder: jest.fn(() => builder),
    };
    const settings: any = {
      getCommunicationConfig: jest.fn(async () => ({ providerName: 'Twilio' })),
      getAdminSettings: jest.fn(async () => ({ communicationTemplates: [
        { id: 'direct-sms', sequenceType: 'Direct', channels: ['SMS'], isActive: true },
        { id: 'follow-sms', sequenceType: 'FollowUp1', channels: ['SMS'], isActive: true, gapDays: 2, name: 'SMS follow-up', body: 'Checking in about {{property_address}}' },
      ] })),
    };
    const sms: any = { send: jest.fn(async () => ({ status: 'Sent' })) };
    const service = new LeadOutreachService(leadRepo, historyRepo, { find: jest.fn() } as never, { find: jest.fn() } as never, { find: jest.fn() } as never, settings, sms);

    const result = await service.sendOutreach({
      leadId: 1,
      kind: 'Sms',
      title: 'Initial SMS',
      message: 'Hello',
      createdBy: 'Lead Intake:1:4:direct-sms:Sms',
      templateId: 'direct-sms',
      attachPropertyDocuments: false,
    });

    expect(result.status).toBe('Sent');
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(2);
    expect(saved[1]).toEqual(expect.objectContaining({ kind: 'Sms', status: 'Scheduled', title: 'SMS follow-up' }));
  });
});
