import { LeadIntakeAutomationService } from './lead-intake-automation.service';
import { PropertyStatus } from '../properties/entities/property.entity';

describe('LeadIntakeAutomationService', () => {
  test('sends only active direct templates and keeps the canonical property', async () => {
    const lead: any = { id: 7, name: 'Client', email: 'client@example.com', phone: '', property: 'Old name', propertyId: 4 };
    const property: any = { id: 4, title: '402 Lake View', status: PropertyStatus.Active };
    const leadRepo: any = { findOne: jest.fn(async () => lead), save: jest.fn(async (value) => value) };
    const propertyRepo: any = { findOne: jest.fn(async () => property), find: jest.fn(async () => [property]) };
    const historyRepo: any = { findOne: jest.fn(async () => null) };
    const settings: any = {
      getAdminSettings: jest.fn(async () => ({ communicationTemplates: [
        { id: 'direct', audience: 'Lead', sequenceType: 'Direct', isActive: true, channels: ['Email'], subject: 'Hi {{client_name}}', body: '{{property_address}}', attachPropertyDocuments: true },
        { id: 'paused', audience: 'Lead', sequenceType: 'Direct', isActive: false, channels: ['Email'], subject: 'Paused', body: 'Paused' },
        { id: 'follow', audience: 'Lead', sequenceType: 'FollowUp1', isActive: true, channels: ['Email'], subject: 'Later', body: 'Later' },
      ] })),
      getSmtpConfig: jest.fn(async () => ({ host: 'smtp.test', username: 'user', password: 'secret' })),
      getCommunicationConfig: jest.fn(async () => null),
    };
    const outreach: any = { sendOutreach: jest.fn(async () => ({ status: 'Sent' })) };
    const service = new LeadIntakeAutomationService(leadRepo, propertyRepo, historyRepo, settings, outreach);

    const result = await service.dispatch(lead.id);

    expect(result.sent).toBe(1);
    expect(lead.property).toBe('402 Lake View');
    expect(outreach.sendOutreach).toHaveBeenCalledTimes(1);
    expect(outreach.sendOutreach).toHaveBeenCalledWith(expect.objectContaining({ templateId: 'direct', attachPropertyDocuments: true }));
  });
});
