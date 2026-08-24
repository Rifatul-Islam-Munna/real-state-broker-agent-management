import { getMetadataArgsStorage } from 'typeorm';
import { Property } from './entities/property.entity';
import { PropertiesService } from './properties.service';

describe('property listing requirements', () => {
  const propertyRepository = {} as any;
  const insightRepository = { create: jest.fn((value) => value) } as any;
  const questionRepository = { create: jest.fn((value) => value) } as any;
  const predictionService = { predictPropertySales: jest.fn().mockResolvedValue(null) } as any;
  const brokerageService = {} as any;
  const settingsService = {
    getAdminSettings: jest.fn().mockResolvedValue({ profile: { defaultPhoneCountry: 'US' } }),
  } as any;
  const service = new PropertiesService(
    propertyRepository,
    insightRepository,
    questionRepository,
    predictionService,
    brokerageService,
    settingsService,
  );

  it('persists qualification and realtor showing fields on Property', () => {
    const columns = getMetadataArgsStorage()
      .columns.filter((column) => column.target === Property)
      .map((column) => column.propertyName);
    expect(columns).toEqual(expect.arrayContaining([
      'minimumCreditScore',
      'minimumMonthlyIncome',
      'securityDeposit',
      'applicationFee',
      'availableFrom',
      'minimumLeaseMonths',
      'applicationInstructions',
      'realtorShowingInstructions',
    ]));
  });

  it('keeps realtor showing instructions private while exposing qualification requirements', async () => {
    const property = Object.assign(new Property(), {
      id: 1,
      title: 'Test Property',
      slug: 'test-property',
      propertyType: 'Residential',
      listingType: 'ForRent',
      price: '$2,500/mo',
      status: 'Active',
      location: 'Miami, FL',
      exactLocation: '123 Main St',
      bedRoom: '2',
      bathRoom: '2',
      width: '1200 sq ft',
      description: 'A sufficiently detailed property description.',
      extraDescription: '',
      ownerName: 'Owner',
      ownerEmail: 'owner@example.com',
      ownerPhone: '+15550000000',
      ownerExtraInfo: '',
      propertyDocuments: [],
      thumbnailUrl: null,
      thumbnailObjectName: null,
      imageUrls: [],
      imageObjectNames: [],
      keyAmenities: [],
      documentRepositoryItemIds: [],
      neighborhoodInsights: [],
      preQuestions: [],
      agentId: null,
      agent: null,
      minimumCreditScore: 680,
      minimumMonthlyIncome: 7500,
      securityDeposit: 2500,
      applicationFee: 50,
      availableFrom: '2026-09-01',
      minimumLeaseMonths: 12,
      applicationInstructions: 'Provide ID and proof of income.',
      realtorShowingInstructions: 'Call owner before showing. Lockbox 1234.',
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
    } as any);

    const mapProperty = (service as any).mapProperty.bind(service);
    const publicResult = await mapProperty(property, false);
    const privateResult = await mapProperty(property, true);

    expect(publicResult.minimumCreditScore).toBe(680);
    expect(publicResult.applicationInstructions).toBe('Provide ID and proof of income.');
    expect(publicResult.realtorShowingInstructions).toBeUndefined();
    expect(privateResult.realtorShowingInstructions).toBe('Call owner before showing. Lockbox 1234.');
  });
});