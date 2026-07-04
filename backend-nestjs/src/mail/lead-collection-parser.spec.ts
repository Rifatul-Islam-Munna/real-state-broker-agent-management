import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  htmlToLeadCollectionText,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
} from './lead-collection-parser';

describe('lead collection template parser', () => {
  const sample = [
    'New Zillow lead',
    'Contact name: John Carter',
    'Email address: john.carter@example.com',
    'Phone number: (415) 555-0188',
    'Property address: 1200 Market Street, San Francisco, CA',
    'Requested a tour of this rental property.',
  ].join('\n');

  const selections = [
    { field: 'name', sampleValue: 'John Carter', required: true, transform: 'Text' as const },
    { field: 'email', sampleValue: 'john.carter@example.com', required: true, transform: 'Email' as const },
    { field: 'phone', sampleValue: '(415) 555-0188', required: true, transform: 'Phone' as const },
    { field: 'property', sampleValue: '1200 Market Street, San Francisco, CA', required: true, transform: 'Text' as const },
  ].map((mapping) => {
    const selectionStart = sample.indexOf(mapping.sampleValue);
    return {
      ...mapping,
      label: mapping.field,
      selectionStart,
      selectionEnd: selectionStart + mapping.sampleValue.length,
      occurrence: 0,
    };
  });

  const mappings = buildLeadCollectionMappings(sample, selections);
  const template = {
    id: 1,
    name: 'Zillow rental inquiry',
    senderPatterns: ['@zillow.com'],
    subjectPattern: 'New Zillow lead',
    subjectMatchMode: 'Contains',
    bodyFingerprint: buildLeadCollectionFingerprint(sample, mappings),
    mappings,
    requiredFields: ['name', 'email', 'phone', 'property'],
    confidenceThreshold: 0.75,
  };

  it('extracts changed contact values from the same provider layout', () => {
    const result = parseLeadCollectionTemplate(template, {
      fromAddress: 'leads@zillow.com',
      subject: 'New Zillow lead for your listing',
      textBody: [
        'New Zillow lead',
        'Contact name: Taylor Morgan',
        'Email address: taylor.morgan@example.net',
        'Phone number: +1 212 555 0104',
        'Property address: 88 Riverside Drive, New York, NY',
        'Requested a tour of this rental property.',
      ].join('\n'),
    });

    expect(result.values).toMatchObject({
      name: 'Taylor Morgan',
      email: 'taylor.morgan@example.net',
      phone: '+1 212 555 0104',
      property: '88 Riverside Drive, New York, NY',
    });
    expect(result.missingRequiredFields).toEqual([]);
    expect(result.confidence).toBeGreaterThanOrEqual(result.threshold);
  });

  it('does not match an unrelated sender and layout', () => {
    const result = parseLeadCollectionTemplates([template], {
      fromAddress: 'newsletter@example.org',
      subject: 'Weekly market report',
      textBody: 'Mortgage rates and neighborhood statistics for this week.',
    });

    expect(result.matched).toBe(false);
    expect(result.templateId).toBeNull();
  });

  it('normalizes HTML email tables into selectable text', () => {
    const text = htmlToLeadCollectionText(`
      <html><body><table>
        <tr><th>Name</th><td>Jamie Lee</td></tr>
        <tr><th>Email</th><td>jamie@example.com</td></tr>
      </table></body></html>
    `);

    expect(text).toContain('Name');
    expect(text).toContain('Jamie Lee');
    expect(text).toContain('jamie@example.com');
    expect(text).not.toContain('<td>');
  });

  it('reports missing required values so the pipeline can fall back', () => {
    const result = parseLeadCollectionTemplate(template, {
      fromAddress: 'leads@zillow.com',
      subject: 'New Zillow lead',
      textBody: [
        'New Zillow lead',
        'Contact name: Taylor Morgan',
        'Email address: taylor@example.net',
        'Phone number:',
        'Property address: 88 Riverside Drive',
        'Requested a tour of this rental property.',
      ].join('\n'),
    });

    expect(result.missingRequiredFields).toContain('phone');
    expect(result.confidence < result.threshold || result.missingRequiredFields.length > 0).toBe(true);
  });
});
