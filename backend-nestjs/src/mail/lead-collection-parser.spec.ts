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

  it('gives full confidence when required manual mappings all match exactly', () => {
    const result = parseLeadCollectionTemplate(
      {
        ...template,
        requiredFields: ['name', 'phone'],
      },
      {
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
      },
    );

    expect(result.missingRequiredFields).toEqual([]);
    expect(result.confidence).toBe(1);
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

  it('prefers labeled linked-page phone values over dates in the email', () => {
    const propertyOnlyTemplate = {
      ...template,
      mappings: template.mappings.filter((mapping) => mapping.field === 'property'),
      requiredFields: ['property', 'phone'],
    };
    const result = parseLeadCollectionTemplate(propertyOnlyTemplate, {
      fromAddress: 'leads@zillow.com',
      subject: 'New Zillow lead',
      textBody: [
        'Lease range: 2006-2026',
        'Property address: 88 Riverside Drive',
        'Linked detail page (https://www.zillow.com/rental-manager/inquiry-contact?name=bradley&phone=754-223-9582)',
        'Name: bradley weneck',
        'Phone: 754-223-9582',
      ].join('\n'),
    });

    expect(result.values.phone).toBe('754-223-9582');
  });

  it('keeps manual mappings even when saved sample text changed', () => {
    const [mapping] = buildLeadCollectionMappings('Different saved body', [{
      field: 'property',
      label: 'Property',
      source: 'LinkedPage',
      sampleValue: '6750 Royal Palm Blvd #209E, Margate, FL, 33063.',
      selectionStart: 10,
      selectionEnd: 60,
      required: false,
      transform: 'Text',
    }]);

    expect(mapping).toMatchObject({
      field: 'property',
      source: 'LinkedPage',
      sampleValue: '6750 Royal Palm Blvd #209E, Margate, FL, 33063.',
    });
  });

  it('does not let linked-page text override an email-body property mapping', () => {
    const emailText = [
      'New application request',
      '6750 Royal Palm Blvd #209E, Margate, FL, 33063.',
      'bradley weneck requested an application:',
    ].join('\n');
    const [propertyMapping] = buildLeadCollectionMappings(emailText, [{
      field: 'property',
      label: 'Property',
      source: 'EmailBody',
      sampleValue: '6750 Royal Palm Blvd #209E, Margate, FL, 33063.',
      selectionStart: emailText.indexOf('6750 Royal Palm'),
      selectionEnd: emailText.indexOf('6750 Royal Palm') + '6750 Royal Palm Blvd #209E, Margate, FL, 33063.'.length,
      required: false,
      transform: 'Text',
    }]);
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [propertyMapping],
      requiredFields: [],
    }, {
      fromAddress: 'leads@example.com',
      subject: 'New application request',
      textBody: [
        emailText,
        'Linked detail page (https://example.com/contact)',
        'Name: bradley weneck',
        'Phone: 754-223-9582',
      ].join('\n'),
    });

    expect(result.values.property).toBe('6750 Royal Palm Blvd #209E, Margate, FL, 33063.');
  });

  it('does not extract the first email line when a text mapping has no stable anchor', () => {
    const [propertyMapping] = buildLeadCollectionMappings('New application request', [{
      field: 'property',
      label: 'Property',
      source: 'EmailBody',
      sampleValue: '6750 Royal Palm Blvd #209E, Margate, FL, 33063.',
      selectionStart: 0,
      selectionEnd: 52,
      required: false,
      transform: 'Text',
    }]);
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [propertyMapping],
      requiredFields: [],
    }, {
      fromAddress: 'leads@example.com',
      subject: 'New application request',
      textBody: 'New application request\nbradley weneck requested an application:',
    });

    expect(result.values.property).toBeUndefined();
  });

  it('uses the exact selected text for multi-line text mappings before newline anchors', () => {
    const emailText = [
      'Hello,',
      'Please find the client and property details below:',
      'Property Name: 750 Royal Palm Blvd #209E',
      'Margate, FL 33063',
      'Client Name: fwafawfawf',
      'Email: g@gmail.com',
      'Phone Number: 01901111111',
    ].join('\n');
    const sampleValue = '750 Royal Palm Blvd #209E Margate, FL 33063';
    const [propertyMapping] = buildLeadCollectionMappings(emailText, [{
      field: 'property',
      label: 'Property',
      source: 'EmailBody',
      sampleValue,
      selectionStart: emailText.indexOf('750 Royal Palm'),
      selectionEnd: emailText.indexOf('Margate, FL 33063') + 'Margate, FL 33063'.length,
      prefix: 'Property Name:',
      required: true,
      transform: 'Text',
    }]);
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [propertyMapping],
      requiredFields: ['property'],
    }, {
      fromAddress: 'test@example.com',
      subject: 'Property details',
      textBody: emailText,
    });

    expect(result.values.property).toBe(sampleValue);
    expect(result.missingRequiredFields).not.toContain('property');
  });

  it('normalizes a credit-score range to the first valid score', () => {
    const emailText = 'Credit score: 720 to 850';
    const [creditMapping] = buildLeadCollectionMappings(emailText, [{
      field: 'creditScore', label: 'Credit Score', source: 'EmailBody',
      sampleValue: '720 to 850', selectionStart: emailText.indexOf('720'),
      selectionEnd: emailText.length, prefix: 'Credit score:', required: false,
      transform: 'CreditScore',
    }]);
    const result = parseLeadCollectionTemplate({
      ...template, senderPatterns: [], subjectPattern: '', mappings: [creditMapping],
      requiredFields: [], bodyFingerprint: [],
    }, {
      fromAddress: 'test@example.com', subject: 'Applicant details', textBody: emailText,
    });
    expect(result.values.creditScore).toBe('720');
  });
});
