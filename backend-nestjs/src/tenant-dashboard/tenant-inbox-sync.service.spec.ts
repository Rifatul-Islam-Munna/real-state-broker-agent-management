import { TenantInboxSyncService } from './tenant-inbox-sync.service';

describe('TenantInboxSyncService property matching', () => {
  const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

  function client(rows: any[]) {
    return {
      query: jest.fn().mockResolvedValue({ rowCount: rows.length, rows }),
    } as any;
  }

  test.each([
    ['6750', 1],
    ['#AWRWRWA 6750', 1],
    ['6750 sf', 1],
    ['6750 NW 8th Street', 1],
  ])('matches platform variant %s to the same property', async (input, expected) => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '930 NE 23rd Ct', payload: { location: 'Pompano Beach, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, input)).resolves.toBe(expected);
  });

  test('does not guess when the same property number is ambiguous', async () => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '6750 SW 12th Ave', payload: { location: 'Miami, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, '6750')).resolves.toBeNull();
  });

  test('uses the common number plus address words to disambiguate', async () => {
    const db = client([
      { id: 1, title: '6750 NW 8th St', payload: { location: 'Fort Lauderdale, FL' } },
      { id: 2, title: '6750 SW 12th Ave', payload: { location: 'Miami, FL' } },
    ]);
    await expect((service as any).matchParsedProperty(db, 'Listing #XYZ 6750 NW 8th Street')).resolves.toBe(1);
  });

  test('finds a property whose address appears in the email subject', async () => {
    const db = client([
      { id: 1, title: '4041 NW 30th Ter Unit #3', payload: {} },
    ]);
    await expect((service as any).matchPropertyMentionedInEmail(db, {
      textBody: 'A renter has requested an application for this property.',
      htmlBody: '',
      subject: 'Pending Applicant for 4041 NW 30th Ter Apt 3, Lauderdale Lakes, FL 33309',
    })).resolves.toEqual({ id: 1, title: '4041 NW 30th Ter Unit #3' });
  });

  test('finds a property whose address appears in the email body', async () => {
    const db = client([
      { id: 1, title: '2500 Parkview Dr Unit #1216', payload: { location: 'Hallandale Beach, FL' } },
      { id: 2, title: '930 NE 23rd Ct', payload: { location: 'Pompano Beach, FL' } },
    ]);
    await expect((service as any).matchPropertyMentionedInEmail(db, {
      textBody: 'Matthew is requesting information about 2500 Parkview Dr #1216, Hallandale Beach, FL, 33009. Send application.',
      htmlBody: '',
    })).resolves.toEqual({ id: 1, title: '2500 Parkview Dr Unit #1216' });
  });

  test('does not guess a property when its address is not mentioned in the email', async () => {
    const db = client([
      { id: 1, title: '2500 Parkview Dr Unit #1216', payload: {} },
    ]);
    await expect((service as any).matchPropertyMentionedInEmail(db, {
      textBody: 'Please call me back about availability in the area.',
      htmlBody: '',
    })).resolves.toBeNull();
  });
});

describe('TenantInboxSyncService auto welcome send', () => {
  function freshLeadRow(overrides: Record<string, any> = {}) {
    return {
      id: 7,
      full_name: 'Matthew kutuk',
      email: 'matthew@example.com',
      phone: '+1 555 010 2233',
      payload: { property: '2500 Parkview Dr Unit #1216' },
      property_id: 3,
      property_title: '2500 Parkview Dr Unit #1216',
      property_payload: {
        propertyDocuments: [
          { name: 'Flyer', fileName: 'flyer.pdf', fileUrl: 'https://cdn.example.com/flyer.pdf' },
          { name: 'App', fileName: 'app.pdf', fileUrl: 'https://cdn.example.com/app.pdf' },
        ],
      },
      ...overrides,
    };
  }

  function buildService(leadRows: any[], agency: any, enqueueResult: any) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_lead l')) {
        return { rowCount: leadRows.length, rows: leadRows };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const settings = {
      getAgencySettings: jest.fn().mockResolvedValue(agency),
    };
    const enqueueWithClient = jest.fn().mockResolvedValue(enqueueResult);
    const outreach = { enqueueWithClient };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      settings as any,
      outreach as any,
    );
    return { service, enqueueWithClient };
  }

  const agencySettings = {
    profile: { agencyName: 'Sunshine Realty', contactName: 'Alex Agent' },
    leadAutomation: { enabled: true, channels: ['Email', 'SMS'], directTemplateId: 'welcome' },
    communicationTemplates: [
      {
        id: 'welcome',
        name: 'Welcome',
        subject: 'Hello {{client_name}}, welcome to {{agency_name}}',
        body: 'Thank you for your interest in {{property_address}}.',
        channels: ['Email', 'SMS'],
        sequenceType: 'Direct',
        audience: 'Lead',
        isActive: true,
        attachmentMode: 'property',
        attachPropertyDocuments: true,
      },
    ],
  };

  test('schedules welcome Email and SMS with rendered tokens and property documents', async () => {
    const { service, enqueueWithClient } = buildService(
      [freshLeadRow()],
      agencySettings,
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).autoSendWelcomeForLeads({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.enqueued).toBe(2);
    expect(enqueueWithClient).toHaveBeenCalledTimes(2);
    const [first, second] = enqueueWithClient.mock.calls.map((call: any[]) => call[1]);
    const email = first.channels[0] === 'Email' ? first : second;
    const sms = first.channels[0] === 'SMS' ? first : second;
    expect(email.channels).toEqual(['Email']);
    expect(email.recipientEmail).toBe('matthew@example.com');
    expect(email.title).toBe('Hello Matthew kutuk, welcome to Sunshine Realty');
    expect(email.body).toBe('Thank you for your interest in 2500 Parkview Dr Unit #1216.');
    expect(email.mediaUrls).toEqual([
      'https://cdn.example.com/flyer.pdf',
      'https://cdn.example.com/app.pdf',
    ]);
    expect(sms.channels).toEqual(['SMS']);
    expect(sms.recipientPhone).toBe('+1 555 010 2233');
    expect(sms.idempotencyKey).toContain('lead-auto-welcome:7:');
  });

  test('skips the SMS channel when the lead has no phone', async () => {
    const { service, enqueueWithClient } = buildService(
      [freshLeadRow({ phone: null })],
      agencySettings,
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).autoSendWelcomeForLeads({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.enqueued).toBe(1);
    expect(enqueueWithClient).toHaveBeenCalledTimes(1);
    expect(enqueueWithClient.mock.calls[0][1].channels).toEqual(['Email']);
  });

  test('does not schedule anything when automation is disabled', async () => {
    const { service, enqueueWithClient } = buildService(
      [freshLeadRow()],
      {
        ...agencySettings,
        leadAutomation: { enabled: false, channels: ['Email'] },
      },
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).autoSendWelcomeForLeads({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.enqueued).toBe(0);
    expect(enqueueWithClient).not.toHaveBeenCalled();
  });

  test('does not attach documents when the template does not request them', async () => {
    const { service, enqueueWithClient } = buildService(
      [freshLeadRow()],
      {
        ...agencySettings,
        communicationTemplates: [
          {
            ...agencySettings.communicationTemplates[0],
            attachmentMode: 'none',
            attachPropertyDocuments: false,
          },
        ],
      },
      [{ status: 'scheduled' }],
    );
    await (service as any).autoSendWelcomeForLeads({
      databaseName: 'tenant_1_demo',
    } as any);
    const email = enqueueWithClient.mock.calls.find(
      (call: any[]) => call[1].channels[0] === 'Email',
    )[1];
    expect(email.mediaUrls).toEqual([]);
  });
});

describe('TenantInboxSyncService follow-up scheduling', () => {
  const followUpLead = {
    id: 7,
    full_name: 'Matthew kutuk',
    email: 'matthew@example.com',
    phone: '+1 555 010 2233',
    property_id: 3,
    property_title: '2500 Parkview Dr Unit #1216',
    property_payload: { propertyDocuments: [] },
    sent_at: new Date('2026-08-17T12:00:00Z'),
  };

  const followUpAgency = {
    profile: { agencyName: 'Sunshine Realty' },
    leadAutomation: {
      enabled: true,
      channels: ['Email', 'SMS'],
      followUpEnabled: true,
    },
    communicationTemplates: [
      {
        id: 'follow-up-1',
        name: 'Follow-up 1',
        subject: 'Following up about {{property_address}}',
        body: 'Hi {{client_name}}, are you still interested?',
        channels: ['Email', 'SMS'],
        sequenceType: 'FollowUp1',
        audience: 'Lead',
        gapDays: 1,
        isActive: true,
      },
      {
        id: 'follow-up-2',
        name: 'Follow-up 2',
        subject: 'Last check',
        body: 'Final follow-up {{client_name}}.',
        channels: ['Email'],
        sequenceType: 'FollowUp2',
        audience: 'Lead',
        gapDays: 3,
        isActive: true,
      },
    ],
  };

  function buildFollowUpService(leadRows: any[], agency: any, enqueueResult: any) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_lead l')) {
        return { rowCount: leadRows.length, rows: leadRows };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const settings = {
      getAgencySettings: jest.fn().mockResolvedValue(agency),
    };
    const enqueueWithClient = jest.fn().mockResolvedValue(enqueueResult);
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      settings as any,
      { enqueueWithClient } as any,
    );
    return { service, enqueueWithClient };
  }

  test('schedules follow-ups after a sent welcome at cumulative gap days', async () => {
    const { service, enqueueWithClient } = buildFollowUpService(
      [followUpLead],
      followUpAgency,
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).scheduleTenantFollowUps({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.enqueued).toBe(3);
    expect(enqueueWithClient).toHaveBeenCalledTimes(3);
    const calls = enqueueWithClient.mock.calls.map((call: any[]) => call[1]);
    const fu1Email = calls.find(
      (item: any) =>
        item.channels[0] === 'Email' &&
        item.idempotencyKey.includes('follow-up-1'),
    );
    const fu1Sms = calls.find(
      (item: any) =>
        item.channels[0] === 'SMS' &&
        item.idempotencyKey.includes('follow-up-1'),
    );
    const fu2Email = calls.find(
      (item: any) =>
        item.channels[0] === 'Email' &&
        item.idempotencyKey.includes('follow-up-2'),
    );
    expect(fu1Email.title).toBe('Following up about 2500 Parkview Dr Unit #1216');
    expect(fu1Email.body).toBe('Hi Matthew kutuk, are you still interested?');
    expect(fu1Email.scheduledAt.getTime()).toBe(
      new Date('2026-08-17T12:00:00Z').getTime() + 86_400_000,
    );
    expect(fu1Sms.recipientPhone).toBe('+1 555 010 2233');
    expect(fu2Email.scheduledAt.getTime()).toBe(
      new Date('2026-08-17T12:00:00Z').getTime() + 4 * 86_400_000,
    );
  });

  test('does not schedule follow-ups when follow-ups are disabled', async () => {
    const { service, enqueueWithClient } = buildFollowUpService(
      [followUpLead],
      {
        ...followUpAgency,
        leadAutomation: { ...followUpAgency.leadAutomation, followUpEnabled: false },
      },
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).scheduleTenantFollowUps({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.enqueued).toBe(0);
    expect(enqueueWithClient).not.toHaveBeenCalled();
  });
});

describe('TenantInboxSyncService stored email conversion', () => {
  test('runs active parser against stored email before manual fallback', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job')) {
        return {
          rowCount: 1,
          rows: [{
            id: 41,
            lead_id: null,
            recipient_email: 'jean@convo.zillow.com',
            title: 'Jean is requesting an application',
            body: 'New application request',
            payload: { htmlBody: '<a>Send application</a>', mailbox: 'Leads' },
            received_at: new Date('2026-08-17T19:01:00Z'),
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({ leadTemplateTags: ['Leads'] }),
    };
    const service = new TenantInboxSyncService({} as any, databases as any, settings as any);
    const parsedLead = { id: 9, full_name: 'Jean Melo' };
    const parse = jest.spyOn(service as any, 'createOrMatchLeadFromTemplate').mockResolvedValue({
      lead: parsedLead,
      result: {
        matched: true,
        templateId: 3,
        templateName: 'Zillow applications',
        matchScore: 1,
        confidence: 1,
        threshold: 0.82,
        values: { name: 'Jean Melo', property: '6750 Royal Palm Blvd' },
        missingRequiredFields: [],
        extractedFields: ['name', 'property'],
        diagnostics: [],
      },
    });

    await expect(service.convertStoredEmailWithTemplate(
      { databaseName: 'tenant_1_demo' } as any,
      41,
    )).resolves.toEqual(parsedLead);
    expect(parse).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      sender: 'jean@convo.zillow.com',
      mailboxTag: 'Leads',
      leadTemplateTags: ['Leads'],
    }));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET lead_id = COALESCE'),
      expect.arrayContaining([41, 9, 'Jean Melo']),
    );
  });
});

describe('TenantInboxSyncService deleted mail protection', () => {
  test('does not reimport a locally deleted provider message', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_mail_deletion_tombstone')) {
        return { rowCount: 1, rows: [{ exists: 1 }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      {} as any,
    );

    await expect((service as any).storeInbound('tenant_1_demo', {
      channel: 'email',
      providerKey: 'gmail:agent@example.com',
      providerMessageId: 'gmail-message-286',
      sender: 'lead@convo.zillow.com',
      recipient: 'agent@example.com',
      subject: 'New lead',
      body: 'Lead body',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      autoCreateLeads: true,
      payload: {},
    })).resolves.toMatchObject({ imported: 0, created: 0, skipped: 1 });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO tenant_outreach_job'))).toBe(false);
    expect(query.mock.calls.map(([sql]) => sql.trim())).toContain('COMMIT');
  });
});

describe('TenantInboxSyncService connection compatibility', () => {
  test('infers Gmail IMAP settings from existing SMTP config', () => {
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
    expect((service as any).imapConnectionConfig({
      providerName: 'Gmail',
      host: 'smtp.gmail.com',
      username: 'agent@example.com',
      password: 'app-password',
    })).toEqual({
      host: 'imap.gmail.com',
      user: 'agent@example.com',
      pass: 'app-password',
    });
  });
});

describe('TenantInboxSyncService stored email recovery', () => {
  test('re-parses previously skipped inbound emails after a sync', async () => {
    const query = jest.fn().mockResolvedValue({
      rowCount: 1,
      rows: [{ id: 101 }],
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({ enableInboxSync: true }),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      settings as any,
    );
    const convert = jest
      .spyOn(service as any, 'convertStoredEmailWithTemplate')
      .mockResolvedValue({ id: 9, full_name: 'Jean Melo' });

    await expect((service as any).recoverSkippedInboundEmails(
      { databaseName: 'tenant_1_demo' } as any,
      { autoCreateLeads: true },
    )).resolves.toEqual({ scanned: 1, converted: 1 });
    expect(convert).toHaveBeenCalledWith(
      { databaseName: 'tenant_1_demo' },
      101,
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("lead_id IS NULL"),
    );
  });

  test('skips recovery when automatic lead creation is disabled', async () => {
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
    await expect((service as any).recoverSkippedInboundEmails(
      { databaseName: 'tenant_1_demo' } as any,
      { autoCreateLeads: false },
    )).resolves.toEqual({ scanned: 0, converted: 0 });
  });

  test('links a property to existing leads that have inbound mail', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_property')) {
        return {
          rowCount: 1,
          rows: [{ id: 21, title: '2500 Parkview Dr Unit #1216', payload: {} }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{
        id: 55,
        lead_id: 31,
        body: 'Requesting info about 2500 Parkview Dr #1216, Hallandale Beach, FL',
        html_body: '',
        extracted_lead: JSON.stringify({ property: '' }),
      }] as any[],
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      {} as any,
    );

    await expect((service as any).linkMissingLeadProperties(
      { databaseName: 'tenant_1_demo' } as any,
    )).resolves.toEqual({ scanned: 1, linked: 1 });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO tenant_lead_property'))).toBe(true);
    const updateCall = query.mock.calls.find(
      ([sql]: [string]) => sql.includes('UPDATE tenant_lead'),
    );
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown[])[1] as unknown[];
    expect(JSON.parse(String(params[1])).property).toContain('2500 Parkview Dr');
  });
});

describe('TenantInboxSyncService active parser processing', () => {
  test('creates a lead from any matching active parser regardless of mailbox tags', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 8,
            payload: {
              name: 'Generic provider parser',
              senderPatterns: ['*@example.com'],
              mailboxTags: ['different-mailbox'],
              mappings: [{
                field: 'property',
                label: 'Property',
                source: 'EmailBody',
                sampleValue: '123 Main St',
                selectionStart: 10,
                selectionEnd: 21,
                prefix: 'Property:',
                suffix: '',
                occurrence: 0,
                required: false,
                transform: 'Text',
              }],
              requiredFields: ['name'],
              confidenceThreshold: 0.99,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 31, full_name: 'Inbound lead' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'lead@example.com',
      subject: 'New inquiry',
      body: 'Property: 123 Main St',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: ['another-tag'],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 31 } });
    expect(parsed.result).toMatchObject({ matched: true, templateId: 8 });
    expect(query.mock.calls.some(([sql]) => sql.includes('INSERT INTO tenant_lead('))).toBe(true);
  });

  test('creates a lead from an email with contact details even when no template matches', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 8,
            payload: {
              name: 'Zillow parser',
              senderPatterns: ['*@other.com'],
              mappings: [],
              requiredFields: [],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 44, full_name: 'Matthew kutuk' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: '3sde1e8zrrpkri1h6w78p0vnurd@convo.zillow.com',
      subject: 'New message',
      body: 'Matthew kutuk says: I would like to schedule a tour.\nPhone: 561-502-3528',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 44 } });
    expect(parsed.result.templateName).toBe('Generic email intake');
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    expect(insertCall).toBeDefined();
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    const payload = JSON.parse(String(insertParams[3]));
    expect(payload.name).toBe('Matthew kutuk');
    expect(payload.phone).toBe('561-502-3528');
  });

  test('replaces a CTA template name and provider email with real values', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 9,
            payload: {
              name: 'Realtor parser',
              senderPatterns: ['*@realtor.com'],
              mappings: [{
                field: 'name',
                label: 'Name',
                source: 'EmailBody',
                prefix: '',
                suffix: ' to schedule',
                occurrence: 0,
                required: false,
                transform: 'Text',
              }],
              requiredFields: [],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 45, full_name: 'Jean Melo Cordova' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'Apply Now',
      body: 'Apply Now to schedule a tour.\nJean Melo Cordova requested an application.\nEmail: leads@email.realtor.com\nPhone: 954-630-6208',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 45 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    expect(insertCall).toBeDefined();
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[0]).toBe('Jean Melo Cordova');
    const payload = JSON.parse(String(insertParams[3]));
    expect(payload.name).toBe('Jean Melo Cordova');
    expect(payload.email ?? '').toBe('');
  });

  test('records the parser skip reason when a stored email still cannot be converted', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('FROM tenant_outreach_job')) {
        return {
          rowCount: 1,
          rows: [{
            id: 42,
            lead_id: null,
            recipient_email: 'jean@convo.zillow.com',
            title: 'Jean is requesting an application',
            body: 'New application request',
            payload: { htmlBody: '<a>Send application</a>', mailbox: 'Leads' },
            received_at: new Date('2026-08-17T19:01:00Z'),
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const settings = {
      getRawSmtp: jest.fn().mockResolvedValue({ leadTemplateTags: ['Leads'] }),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      settings as any,
    );
    jest.spyOn(service as any, 'createOrMatchLeadFromTemplate').mockResolvedValue({
      lead: null,
      created: false,
      result: {
        matched: false,
        templateId: null,
        templateName: '',
        matchScore: 0,
        confidence: 0,
        threshold: 0.82,
        values: {},
        missingRequiredFields: [],
        extractedFields: [],
        diagnostics: ['No saved template matched this email.'],
        scopeMatched: false,
      },
    });

    await expect(service.convertStoredEmailWithTemplate(
      { databaseName: 'tenant_1_demo' } as any,
      42,
    )).resolves.toBeNull();

    const updateCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('SET lead_id = COALESCE($2, lead_id)'),
    );
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown[])[1] as unknown[];
    const payload = JSON.parse(String(params[3]));
    expect(payload.leadCreationStatus).toBe('Skipped');
    expect(payload.leadCreationSkipReason).toContain('No saved template matched');
    expect(payload.lastLeadRecoveryAttemptAt).toBeDefined();
  });

  test('uses provider sender for dedupe only when parser extracted no contact', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
    await (service as any).findLeadFromParsedValues(
      { query },
      'person@example.com',
      '',
      'shared-provider@example.net',
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("$1 = '' AND $2 = '' AND $3 <> ''"),
      ['person@example.com', '', 'shared-provider@example.net'],
    );
  });
});
