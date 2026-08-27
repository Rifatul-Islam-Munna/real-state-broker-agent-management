import { mapPropertyKnowledge } from './property-knowledge.mapper';

describe('property knowledge mapper', () => {
  const property = {
    id: 41,
    title: 'Oak Street Home',
    status: 'published',
    payload: {
      description: 'Bright two-bedroom home with a private driveway.',
      minimumCreditScore: 680,
      monthlyRent: 2400,
      amenities: ['Parking', 'Laundry'],
      keyAmenities: ['Gym', 'Garage'],
      bedRoom: '2',
      bathRoom: '1',
      realtorShowingInstructions: 'Use lockbox at the rear entrance.',
      ownerName: 'Private Owner',
      ownerEmail: 'owner@example.com',
      ownerPhone: '+15550100',
      ownerExtraInfo: 'Owner is traveling until Friday.',
      internalRemarks: 'Do not disclose the alarm note.',
      entryInstructions: 'Enter through the rear gate.',
      lockboxCode: '8472',
      commissionInfo: '2.5% co-broke.',
    },
  };

  it('maps public facts for leads without internal fields', () => {
    const leadChunks = mapPropertyKnowledge(property).filter(
      (chunk) => chunk.audience === 'LEAD',
    );
    const text = leadChunks.map((chunk) => chunk.content).join('\n');

    expect(text).toContain('Bright two-bedroom home');
    expect(text).toContain('Minimum credit score: 680');
    expect(text).toContain('Parking');
    expect(text).toContain('Key amenities: Gym, Garage');
    expect(text).toContain('Bedrooms: 2');
    expect(text).not.toContain('lockbox');
    expect(text).not.toContain('owner@example.com');
    expect(text).not.toContain('Private Owner');
    expect(text).not.toContain('alarm note');
    expect(text).not.toContain('8472');
    expect(text).not.toContain('rear gate');
    expect(text).not.toContain('2.5% co-broke');
    expect(leadChunks.every((chunk) => chunk.propertyId === 41)).toBe(true);
  });

  it('adds explicitly internal fields only to realtor chunks', () => {
    const realtorChunks = mapPropertyKnowledge(property).filter(
      (chunk) => chunk.audience === 'REALTOR',
    );
    const text = realtorChunks.map((chunk) => chunk.content).join('\n');

    expect(text).toContain('Use lockbox at the rear entrance.');
    expect(text).toContain('owner@example.com');
    expect(text).toContain('Owner is traveling until Friday.');
    expect(text).toContain('Lockbox code: 8472');
    expect(text).toContain('Entry instructions: Enter through the rear gate.');
    expect(text).toContain('Commission information: 2.5% co-broke.');
  });

  it('ignores unknown payload fields instead of exposing them', () => {
    const chunks = mapPropertyKnowledge({
      ...property,
      payload: {
        ...property.payload,
        unreviewedSecretField: 'never index this',
      },
    });

    expect(chunks.map((chunk) => chunk.content).join('\n')).not.toContain(
      'never index this',
    );
  });

  it('uses a clean separator in generated knowledge titles', () => {
    const description = mapPropertyKnowledge(property).find(
      (chunk) => chunk.sourceKey === 'property:41:LEAD:description',
    );

    expect(description?.title).toBe('Oak Street Home — Description');
  });

  it('extracts a dedicated minimum credit score fact from listing text', () => {
    const chunks = mapPropertyKnowledge({
      id: 42,
      title: 'Lime Bay Condo',
      status: 'published',
      payload: {
        description:
          'LEASING CRITERIA: Credit Score >> 720. No criminal or eviction history.',
      },
    });

    expect(
      chunks.find(
        (chunk) =>
          chunk.sourceKey === 'property:42:LEAD:minimumCreditScore',
      )?.content,
    ).toBe('Minimum credit score: 720');
  });

  it('splits a large listing description into concise searchable facts', () => {
    const chunks = mapPropertyKnowledge({
      id: 43,
      title: 'Lime Bay Condo',
      status: 'published',
      payload: {
        description: [
          'MOVE-IN COSTS: First Month, Last Month, and Security Deposit. ($4,650)',
          'UTILITIES: Rent includes cable, gas, trash, internet, and water.',
          'APPLICATION FEE (For Landlord Approval): $50 per adult.',
          'PETS: No.',
          'paking spot 1 and 1 guest parking',
          'MINIMUM LEASE DURATION: 1 Year',
          'SMOKING: No smoking allowed inside the property',
        ].join('\n'),
      },
    }).filter((chunk) => chunk.audience === 'LEAD');
    const facts = chunks
      .filter((chunk) => chunk.sourceKey.includes(':descriptionDetail:'))
      .map((chunk) => chunk.content);

    expect(facts).toEqual(expect.arrayContaining([
      'Move-in costs: First Month, Last Month, and Security Deposit. ($4,650)',
      'Utilities: Rent includes cable, gas, trash, internet, and water.',
      'Application fee (for landlord approval): $50 per adult.',
      'Pet policy: No.',
      'Parking: paking spot 1 and 1 guest parking',
      'Minimum lease duration: 1 Year',
      'Smoking: No smoking allowed inside the property',
    ]));
  });

  it('splits long prose into sentence-sized answer facts', () => {
    const chunks = mapPropertyKnowledge({
      id: 44,
      title: 'Lime Bay Condo',
      payload: {
        description:
          'This top-floor condo has two bedrooms. It is near supermarkets and local dining. Commuting is easy with access to I-75.',
      },
    }).filter(
      (chunk) =>
        chunk.audience === 'LEAD' &&
        chunk.sourceKey.includes(':descriptionDetail:'),
    );

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      'Description detail: This top-floor condo has two bedrooms.',
      'Description detail: It is near supermarkets and local dining.',
      'Description detail: Commuting is easy with access to I-75.',
    ]);
  });
});
