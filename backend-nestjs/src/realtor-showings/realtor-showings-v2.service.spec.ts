import { PropertyStatus } from '../properties/entities/property.entity';
import { RealtorShowingsV2Service } from './realtor-showings-v2.service';

describe('RealtorShowingsV2Service', () => {
  test('matches a shortened address by exact street number', async () => {
    const savedLead: any = { id: 10, email: 'agent@example.com', phone: '', property: '', propertyId: null };
    const query = { where: jest.fn().mockReturnThis(), getOne: jest.fn(async () => savedLead) };
    const leadRepo: any = { createQueryBuilder: jest.fn(() => query), save: jest.fn(async (value) => value), create: jest.fn((value) => value) };
    const propertyRepo: any = { find: jest.fn(async () => [
      { id: 1, title: '402 Lake View Drive, Austin', location: 'Austin', exactLocation: '402 Lake View Drive', status: PropertyStatus.Active },
      { id: 2, title: '4144 Oak Street', location: 'Dallas', exactLocation: '4144 Oak Street', status: PropertyStatus.Active },
    ]) };
    const showingRepo: any = { create: jest.fn((value) => value), save: jest.fn(async (value) => ({ id: 20, ...value })) };
    const settings: any = { getAdminSettings: jest.fn(async () => ({ profile: { defaultPhoneCountry: 'US' }, communicationTemplates: [] })) };
    const scheduling: any = { getSettings: jest.fn(async () => ({ timeZone: 'America/Chicago' })) };
    const service = new RealtorShowingsV2Service(showingRepo, propertyRepo, leadRepo, {} as never, {} as never, settings, scheduling, { create: jest.fn(), findMatching: jest.fn().mockResolvedValue(null) } as never);

    const result = await service.importRows({
      rows: [{ Email: 'agent@example.com', Property: '402 Lake View' }],
      mapping: { realtorEmail: 'Email', property: 'Property' },
      emailEnabled: false,
      smsEnabled: false,
    });

    expect(result.createdCount).toBe(1);
    expect(showingRepo.create).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 1, propertyMatchMethod: 'Auto' }));
    expect(savedLead.propertyId).toBe(1);
    expect(savedLead.property).toBe('402 Lake View Drive, Austin');
  });
});
