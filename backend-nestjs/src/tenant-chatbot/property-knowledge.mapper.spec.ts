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
      realtorShowingInstructions: 'Use lockbox at the rear entrance.',
      ownerName: 'Private Owner',
      ownerEmail: 'owner@example.com',
      ownerPhone: '+15550100',
      ownerExtraInfo: 'Owner is traveling until Friday.',
      internalRemarks: 'Do not disclose the alarm note.',
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
    expect(text).not.toContain('lockbox');
    expect(text).not.toContain('owner@example.com');
    expect(text).not.toContain('Private Owner');
    expect(text).not.toContain('alarm note');
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
});
