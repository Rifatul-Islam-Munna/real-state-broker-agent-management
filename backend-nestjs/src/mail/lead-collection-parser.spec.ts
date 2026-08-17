import {
  buildLeadCollectionFingerprint,
  buildLeadCollectionMappings,
  deriveNameFromEmail,
  extractLeadBasicsFromEmail,
  htmlToLeadCollectionText,
  parseLeadCollectionTemplate,
  parseLeadCollectionTemplates,
  sanitizeLeadName,
  scoreLeadCollectionTemplate,
  subjectNameFromSubject,
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

  it('prefers a labeled prospect email over the sender address', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'Pending Applicant',
      textBody: [
        'You can contact your new client at the following number:',
        'Name: ROCIO CUBA',
        'Phone: 7862526727',
        'Email: norahsbec@gmail.com',
        'Property: 1000 NE 14th Ave Apt 411, Hallandale Beach, FL 33009',
      ].join('\n'),
    });

    expect(result.values.email).toBe('norahsbec@gmail.com');
  });

  it('extracts name, email, and phone generically even when the template does not map them', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: '3sde1e8zrrpkri1h6w78p0vnurd@convo.zillow.com',
      subject: 'New message',
      textBody: [
        'New message',
        'Matthew kutuk says: I would like to schedule a tour.',
        'Email: matthew@example.com',
        'Phone: 561-502-3528',
      ].join('\n'),
    });

    expect(result.values.name).toBe('Matthew kutuk');
    expect(result.values.email).toBe('matthew@example.com');
    expect(result.values.phone).toBe('561-502-3528');
  });

  it('ignores provider sender addresses when no real email is present', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead',
      textBody: [
        'A new lead has been sent to you.',
        'Contact the sender at leads@email.realtor.com.',
        'Phone: 347-737-4177',
      ].join('\n'),
    });
    expect(result.values.name ?? '').toBe('');
    expect(result.values.email ?? '').toBe('');
    expect(result.values.phone).toBe('347-737-4177');
  });

  it('ignores Zillow system sender addresses like rentalapplications@zillow.com', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'rentalapplications@zillow.com',
      subject: 'New application',
      textBody: [
        'Jean Melo Cordova requested an application.',
        'For questions email rentalapplications@zillow.com.',
        'Phone: 954-630-6208',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Jean Melo Cordova');
    expect(result.values.email ?? '').toBe('');
    expect(result.values.phone).toBe('954-630-6208');
  });

  it('rejects CTA phrases as names', () => {
    expect(sanitizeLeadName('Apply Now')).toBe('');
    expect(sanitizeLeadName('Request Information')).toBe('');
    expect(sanitizeLeadName('Apply Now', 'Apply Now')).toBe('');
    expect(sanitizeLeadName('Jean Melo Cordova')).toBe('Jean Melo Cordova');
    expect(sanitizeLeadName('Matthew kutuk')).toBe('Matthew kutuk');
  });

  it('extracts a labeled Name field from the email body', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New lead',
      textBody: [
        'Name: Norah Bec',
        'Email: norahsbec@gmail.com',
        'Phone: 786-252-6727',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Norah Bec');
  });

  it('keeps the fingerprint free of dates, times, and stripped-value fragments', () => {
    const sample = [
      'New lead from realtor.com',
      'August 13, 2026 5:08 pm',
      '"I am interested in 10545 W 32nd Ln Unit 0, Hialeah, FL 33018."',
      'Name',
      'Lianet Santana',
      'Phone',
      '786-548-5124',
      'Email',
      'lianet.santana698@gmail.com',
    ].join('\n');
    const selections = [
      { field: 'name', sampleValue: 'Lianet Santana', required: false, transform: 'Text' as const },
      { field: 'phone', sampleValue: '786-548-5124', required: false, transform: 'Phone' as const },
      { field: 'email', sampleValue: 'lianet.santana698@gmail.com', required: false, transform: 'Email' as const },
      { field: 'property', sampleValue: '10545 W 32nd Ln Unit 0, Hialeah, FL 33018', required: false, transform: 'Text' as const },
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
    const fingerprint = buildLeadCollectionFingerprint(
      sample,
      buildLeadCollectionMappings(sample, selections),
    );
    expect(fingerprint.some((line) => line.includes('august'))).toBe(false);
    expect(fingerprint.some((line) => line.includes('5:08'))).toBe(false);
    expect(fingerprint.some((line) => line.includes('interested in .'))).toBe(false);
    expect(fingerprint).toContain('name');
    expect(fingerprint).toContain('phone');
    expect(fingerprint).toContain('email');
    expect(fingerprint).toContain('new lead from realtor.com');
  });

  it('still matches a live email whose date, quote, and details differ from the sample', () => {
    const sample = [
      'New lead from realtor.com',
      'August 13, 2026 5:08 pm',
      '"I am interested in 10545 W 32nd Ln Unit 0, Hialeah, FL 33018."',
      'Name',
      'Lianet Santana',
      'Phone',
      '786-548-5124',
      'Email',
      'lianet.santana698@gmail.com',
    ].join('\n');
    const selections = [
      { field: 'name', sampleValue: 'Lianet Santana', required: false, transform: 'Text' as const },
      { field: 'phone', sampleValue: '786-548-5124', required: false, transform: 'Phone' as const },
      { field: 'email', sampleValue: 'lianet.santana698@gmail.com', required: false, transform: 'Email' as const },
      { field: 'property', sampleValue: '10545 W 32nd Ln Unit 0, Hialeah, FL 33018', required: false, transform: 'Text' as const },
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
      id: 91,
      name: 'Realtor live',
      senderPatterns: ['*@email.realtor.com'],
      subjectPattern: 'Pending Applicant for 10545 W 32nd Ln Unit 0',
      subjectMatchMode: 'Contains',
      bodyFingerprint: buildLeadCollectionFingerprint(sample, mappings),
      mappings,
      requiredFields: ['name', 'email', 'phone', 'property'],
      confidenceThreshold: 0.75,
    };

    const liveEmail = [
      'New lead from realtor.com',
      'August 17, 2026 3:54 pm',
      '"I am interested in 6750 Royal Palm Blvd Unit 209E."',
      'Name',
      'Steve Francis',
      'Phone',
      '786-419-5269',
      'Email',
      'starheights56@comcast.net',
    ].join('\n');
    const score = scoreLeadCollectionTemplate(template, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Steve Francis',
      textBody: liveEmail,
    });
    expect(score).toBeGreaterThanOrEqual(0.35);

    const result = parseLeadCollectionTemplate(template, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Steve Francis',
      textBody: liveEmail,
    });
    expect(result.values.name).toBe('Steve Francis');
    expect(result.values.phone).toBe('786-419-5269');
    expect(result.values.email).toBe('starheights56@comcast.net');
  });

  it('extracts a space-separated one-line Name (realtor.com sidebar layout)', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Steve Francis',
      textBody: [
        'Name Steve Francis',
        'Phone 786-419-5269',
        'Email starheights56@comcast.net',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Steve Francis');
    expect(result.values.phone).toBe('786-419-5269');
    expect(result.values.email).toBe('starheights56@comcast.net');
  });

  it('extracts a From-header name', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'norahsbec@gmail.com',
      subject: 'New message',
      textBody: [
        'From: Norah Bec <norahsbec@gmail.com>',
        'Phone: 786-252-6727',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Norah Bec');
  });

  it('extracts a name on the line after the Name label (realtor.com table layout)', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      mappings: [],
      requiredFields: [],
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'com lead - Gerard Piette',
      textBody: [
        'New lead from realtor.com',
        'Name',
        'Gerard Piette',
        'Phone',
        '9545365129',
        'Email',
        'g.piette@yahoo.com',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Gerard Piette');
    expect(result.values.phone).toBe('9545365129');
    expect(result.values.email).toBe('g.piette@yahoo.com');
  });

  it('extracts the prospect name from the email subject', () => {
    expect(subjectNameFromSubject('com lead - Gerard Piette')).toBe('Gerard Piette');
    expect(subjectNameFromSubject('New Lead: Jane Doe')).toBe('Jane Doe');
    expect(subjectNameFromSubject('Inquiry - John Smith')).toBe('John Smith');
    expect(subjectNameFromSubject('New message from Zillow')).toBe('');
  });

  it('derives a readable name from a personal email local part', () => {
    expect(deriveNameFromEmail('norah.bec@gmail.com')).toBe('Norah Bec');
    expect(deriveNameFromEmail('john.doe@example.com')).toBe('John Doe');
    expect(deriveNameFromEmail('leads@email.realtor.com')).toBe('');
    expect(deriveNameFromEmail('rentalapplications@zillow.com')).toBe('');
    expect(deriveNameFromEmail('user1234@gmail.com')).toBe('');
    expect(deriveNameFromEmail('abc@gmail.com')).toBe('');
    expect(deriveNameFromEmail('norahsbec@gmail.com')).toBe('');
  });

  it('picks the prospect email from a mailto link over the provider address', () => {
    const result = extractLeadBasicsFromEmail({
      fromAddress: 'leads@email.realtor.com',
      subject: 'com lead - Johny Tobon',
      htmlBody: `
        <table><tr><td>Name</td><td>Johny Tobon</td></tr></table>
        <p>For help, contact <a href="mailto:leads@email.realtor.com">leads@email.realtor.com</a></p>
        <p>Reply to <a href="mailto:johnyalto@hotmail.com">johnyalto@hotmail.com</a></p>
      `,
    });
    expect(result.name).toBe('Johny Tobon');
    expect(result.email).toBe('johnyalto@hotmail.com');
  });

  it('skips the provider address even when it appears first in the body', () => {
    const result = extractLeadBasicsFromEmail({
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Johny Tobon',
      htmlBody: `
        <p>Questions? Email <a href="mailto:leads@email.realtor.com">leads@email.realtor.com</a>.</p>
        <table><tr><td>Name</td><td>Johny Tobon</td></tr>
        <tr><td>Email</td><td>johnyalto@hotmail.com</td></tr>
        <tr><td>Phone</td><td>3058792145</td></tr></table>
      `,
    });
    expect(result.name).toBe('Johny Tobon');
    expect(result.email).toBe('johnyalto@hotmail.com');
    expect(result.phone).toBe('3058792145');
  });

  it('replaces a mapped provider email with the mailto prospect email', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      id: 77,
      name: 'Realtor live',
      senderPatterns: ['*@email.realtor.com'],
      subjectPattern: 'New realtor.com lead',
      subjectMatchMode: 'Contains',
      bodyFingerprint: [],
      mappings: [{
        field: 'name',
        label: 'Name',
        source: 'EmailBody',
        sampleValue: '',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Name',
        suffix: '',
        occurrence: 0,
        required: true,
        transform: 'Text',
      }, {
        field: 'email',
        label: 'Email',
        source: 'EmailBody',
        sampleValue: '',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Email',
        suffix: '',
        occurrence: 0,
        required: true,
        transform: 'Email',
      }, {
        field: 'phone',
        label: 'Phone',
        source: 'EmailBody',
        sampleValue: '',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Phone',
        suffix: '',
        occurrence: 0,
        required: true,
        transform: 'Phone',
      }],
      requiredFields: ['name', 'email', 'phone'],
      confidenceThreshold: 0.5,
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Johny Tobon',
      htmlBody: `
        <table><tr><td>Name</td><td>Johny Tobon</td></tr>
        <tr><td>Email</td><td>leads@email.realtor.com</td></tr>
        <tr><td>Phone</td><td>3058792145</td></tr></table>
        <p>Reply to <a href="mailto:johnyalto@hotmail.com">johnyalto@hotmail.com</a></p>
      `,
    });
    expect(result.values.name).toBe('Johny Tobon');
    expect(result.values.email).toBe('johnyalto@hotmail.com');
    expect(result.values.phone).toBe('3058792145');
  });

  it('extracts table-cell values with the UI-style "Name:" label prefix', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      id: 88,
      name: 'Realtor table layout',
      senderPatterns: ['*@email.realtor.com'],
      subjectPattern: 'New realtor.com lead',
      subjectMatchMode: 'Contains',
      bodyFingerprint: [],
      mappings: [{
        field: 'name',
        label: 'Name',
        source: 'EmailBody',
        sampleValue: 'Johny Tobon',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Name:',
        suffix: '',
        occurrence: 0,
        required: true,
        transform: 'Text',
      }, {
        field: 'phone',
        label: 'Phone',
        source: 'EmailBody',
        sampleValue: '3058792145',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Phone:',
        suffix: '',
        occurrence: 0,
        required: true,
        transform: 'Phone',
      }],
      requiredFields: ['name', 'phone'],
      confidenceThreshold: 0.5,
    }, {
      fromAddress: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Sarah Lane',
      textBody: [
        'New lead from realtor.com',
        'Name',
        'Sarah Lane',
        'Phone',
        '7862526727',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Sarah Lane');
    expect(result.values.phone).toBe('7862526727');
  });

  it('respects the mapped occurrence when a label repeats', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      id: 89,
      name: 'Repeated label layout',
      senderPatterns: ['*@example.com'],
      subjectPattern: 'Inquiry',
      subjectMatchMode: 'Contains',
      bodyFingerprint: [],
      mappings: [{
        field: 'name',
        label: 'Contact',
        source: 'EmailBody',
        sampleValue: 'Sarah Lane',
        selectionStart: -1,
        selectionEnd: -1,
        prefix: 'Contact',
        suffix: '',
        occurrence: 1,
        required: true,
        transform: 'Text',
      }],
      requiredFields: ['name'],
      confidenceThreshold: 0.5,
    }, {
      fromAddress: 'inbox@example.com',
      subject: 'Inquiry about a listing',
      textBody: [
        'Agent contact',
        'Sam Wells',
        'Lead contact',
        'Sarah Lane',
      ].join('\n'),
    });
    expect(result.values.name).toBe('Sarah Lane');
  });

  it('recovers the property from the body when the mapped address misses', () => {
    const result = parseLeadCollectionTemplate({
      ...template,
      id: 90,
      name: 'Property recovery',
      senderPatterns: ['*@example.com'],
      subjectPattern: 'New lead',
      subjectMatchMode: 'Contains',
      bodyFingerprint: [],
      mappings: [],
      requiredFields: ['property'],
      confidenceThreshold: 0.5,
    }, {
      fromAddress: 'leads@example.com',
      subject: 'New lead',
      textBody: [
        'I am interested in 8526 NW 107th Psge Unit 2-40, Doral, FL 33178.',
        'Phone: 786-252-6727',
      ].join('\n'),
    });
    expect(result.values.property).toContain('8526 NW 107th Psge');
    expect(result.missingRequiredFields).not.toContain('property');
  });
});
