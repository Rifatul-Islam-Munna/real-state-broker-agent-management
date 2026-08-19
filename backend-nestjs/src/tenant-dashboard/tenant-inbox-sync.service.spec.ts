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

describe('TenantInboxSyncService reply matching', () => {
  test('matches email only against lead email, not stored proxy sender', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    await (service as any).findLead({ query }, 'email', 'other@example.com');

    const sql = query.mock.calls[0][0];
    expect(sql).toContain("to_jsonb(lead)->>'email'");
    expect(sql).not.toContain('inboundReplyAddress');
  });

  test.each(['Email', 'SMS'] as const)(
    'requires prior sent %s outreach before treating inbound message as reply',
    async (channel) => {
      const query = jest.fn().mockResolvedValue({ rowCount: 0, rows: [] });
      const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
      const receivedAt = new Date('2026-08-18T00:00:00Z');

      await expect(
        (service as any).hasPriorSentOutreach(
          { query },
          9,
          channel,
          receivedAt,
          channel === 'Email' ? 'buyer@example.com' : '+1 555 010 2233',
        ),
      ).resolves.toBe(false);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("AND status = 'sent'"),
        [
          9,
          channel,
          receivedAt,
          channel === 'Email' ? 'buyer@example.com' : '+1 555 010 2233',
        ],
      );
    },
  );
});

describe('TenantInboxSyncService post-visit board cleanup', () => {
  test('removes unreplied post-visit follow-up after two days', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 9 }] });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      {} as any,
    );

    await expect(
      (service as any).removeStalePostVisitFollowUps({ databaseName: 'tenant_1_demo' }),
    ).resolves.toEqual({ removed: 1 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("payload->>'postVisitFollowUpSentAt'"),
      [2],
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("'inBoard', false"),
      [2],
    );
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
              subjectPattern: 'New inquiry',
              subjectMatchMode: 'Contains',
              sourceText: 'Name: Taylor Morgan\nProperty: 123 Main St',
              mappings: [
                {
                  field: 'name',
                  label: 'Name',
                  source: 'EmailBody',
                  sampleValue: 'Taylor Morgan',
                  selectionStart: 6,
                  selectionEnd: 19,
                  prefix: 'Name:',
                  suffix: 'Property:',
                  occurrence: 0,
                  required: true,
                  transform: 'Text',
                },
                {
                  field: 'property',
                  label: 'Property',
                  source: 'EmailBody',
                  sampleValue: '123 Main St',
                  selectionStart: 30,
                  selectionEnd: 41,
                  prefix: 'Property:',
                  suffix: '',
                  occurrence: 0,
                  required: false,
                  transform: 'Text',
                },
              ],
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
      body: 'Name: Taylor Morgan\nProperty: 123 Main St\nPhone: 786-555-0101',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: ['another-tag'],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 31 } });
    expect(parsed.result).toMatchObject({ matched: true, templateId: 8 });
    const insertCall = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO tenant_lead('));
    expect(insertCall).toBeDefined();
    expect(JSON.parse(insertCall?.[1]?.[3] as string)).toMatchObject({ inBoard: false });
  });

  test('does not create a lead when no active template matches', async () => {
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

    expect(parsed).toMatchObject({ created: false, lead: null });
    expect(parsed.result.matched).toBe(false);
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    expect(insertCall).toBeUndefined();
  });

  test('normalizes the extracted phone with the tenant default country', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 12,
            payload: {
              name: 'Realtor parser',
              senderPatterns: ['*@email.realtor.com'],
              subjectPattern: 'New realtor.com lead',
              subjectMatchMode: 'Contains',
              sourceText: 'Name: Johny Tobon\nPhone: 3058792145',
              mappings: [{
                field: 'phone',
                label: 'Phone',
                source: 'EmailBody',
                sampleValue: '3058792145',
                selectionStart: 25,
                selectionEnd: 35,
                prefix: 'Phone:',
                suffix: '',
                occurrence: 0,
                required: false,
                transform: 'Phone',
              }],
              requiredFields: [],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes("key = 'agency_workspace_settings'")) {
        return {
          rowCount: 1,
          rows: [{ value: { profile: { defaultPhoneCountry: 'US' } } }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 48, full_name: 'Johny Tobon' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Johny Tobon',
      body: 'Name: Johny Tobon\nPhone: 3058792145',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 48 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[2]).toBe('+13058792145');
    const payload = JSON.parse(String(insertParams[3]));
    expect(payload.phone).toBe('+13058792145');
  });

  test('creates a complete lead from a live realtor.com email (name/email/phone/property)', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 14,
            payload: {
              name: 'Realtor parser',
              senderPatterns: ['*@email.realtor.com'],
              subjectPattern: 'New realtor.com lead',
              subjectMatchMode: 'Contains',
              sourceHtml: [
                '<table><tr><td>Name</td><td>Steve Francis</td></tr>',
                '<tr><td>Phone</td><td>786-419-5269</td></tr>',
                '<tr><td>Email</td><td>starheights56@comcast.net</td></tr>',
                '<tr><td>Property</td><td>6750 Royal Palm Blvd Unit 209E</td></tr>',
                '</table>',
              ].join(''),
              sourceText: '',
              mappings: [{
                field: 'name',
                label: 'Name',
                source: 'EmailBody',
                sampleValue: 'Steve Francis',
                selectionStart: -1,
                selectionEnd: -1,
                prefix: 'Name:',
                suffix: '',
                occurrence: 0,
                required: true,
                transform: 'Text',
              }, {
                field: 'email',
                label: 'Email',
                source: 'EmailBody',
                sampleValue: 'starheights56@comcast.net',
                selectionStart: -1,
                selectionEnd: -1,
                prefix: 'Email:',
                suffix: '',
                occurrence: 0,
                required: true,
                transform: 'Email',
              }, {
                field: 'phone',
                label: 'Phone',
                source: 'EmailBody',
                sampleValue: '786-419-5269',
                selectionStart: -1,
                selectionEnd: -1,
                prefix: 'Phone:',
                suffix: '',
                occurrence: 0,
                required: true,
                transform: 'Phone',
              }],
              requiredFields: ['name', 'email', 'phone', 'property'],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 50, full_name: 'Steve Francis' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Steve Francis',
      body: [
        '"I am interested in 6750 Royal Palm Blvd Unit 209E."',
        'Name Steve Francis',
        'Phone 786-419-5269',
        'Email starheights56@comcast.net',
      ].join('\n'),
      receivedAt: new Date('2026-08-18T01:54:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 50 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    expect(insertCall).toBeDefined();
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[0]).toBe('Steve Francis');
    expect(insertParams[1]).toBe('starheights56@comcast.net');
    expect(insertParams[2]).toBe('+17864195269');
    const payload = JSON.parse(String(insertParams[3]));
    expect(payload.property).toContain('6750 Royal Palm Blvd');
  });

  test('sync extraction matches the template Test button via rebuilt mappings', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 13,
            payload: {
              name: 'Realtor parser',
              senderPatterns: ['*@email.realtor.com'],
              subjectPattern: 'New realtor.com lead',
              subjectMatchMode: 'Contains',
              sourceHtml: [
                '<table><tr><td>Name</td><td>Johny Tobon</td></tr>',
                '<tr><td>Phone</td><td>3058792145</td></tr></table>',
              ].join(''),
              sourceText: '',
              mappings: [{
                field: 'name',
                label: 'Name',
                source: 'EmailBody',
                sampleValue: 'Johny Tobon',
                selectionStart: 3,
                selectionEnd: 14,
                prefix: 'Name:',
                suffix: '',
                occurrence: 0,
                required: true,
                transform: 'Text',
              }],
              requiredFields: ['name'],
              confidenceThreshold: 0.5,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 49, full_name: 'Sarah Lane' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'New realtor.com lead - Sarah Lane',
      body: [
        'New lead from realtor.com',
        'Name',
        'Sarah Lane',
        'Phone',
        '7862526727',
      ].join('\n'),
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 49 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[0]).toBe('Sarah Lane');
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
              subjectPattern: 'Apply Now',
              subjectMatchMode: 'Contains',
              sourceText: 'Apply Now to schedule a tour.\nJean Melo Cordova requested an application.\nPhone: 954-630-6208',
              mappings: [{
                field: 'name',
                label: 'Name',
                source: 'EmailBody',
                sampleValue: 'Apply Now',
                selectionStart: 0,
                selectionEnd: 9,
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

  test('does not use the raw email or phone as the lead name', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 10,
            payload: {
              name: 'Generic parser',
              senderPatterns: ['*@realtor.com'],
              subjectPattern: 'New lead',
              subjectMatchMode: 'Contains',
              sourceText: 'Phone: 981-012-0026\nProperty: 1401 Grant St Unit#3',
              mappings: [{
                field: 'phone',
                label: 'Phone',
                source: 'EmailBody',
                sampleValue: '981-012-0026',
                selectionStart: 7,
                selectionEnd: 19,
                prefix: 'Phone:',
                suffix: 'Property:',
                occurrence: 0,
                required: false,
                transform: 'Phone',
              }],
              requiredFields: [],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 46, full_name: 'Inbound lead' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'New lead',
      body: 'Phone: 981-012-0026\nProperty: 1401 Grant St Unit#3',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 46 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[0]).toBe('Inbound lead');
  });

  test('derives a display name from a personal email when no name is present', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 11,
            payload: {
              name: 'Generic parser',
              senderPatterns: ['*@realtor.com'],
              subjectPattern: 'New lead',
              subjectMatchMode: 'Contains',
              sourceText: 'Email: norah.bec@gmail.com\nPhone: 786-252-6727',
              mappings: [{
                field: 'email',
                label: 'Email',
                source: 'EmailBody',
                sampleValue: 'norah.bec@gmail.com',
                selectionStart: 7,
                selectionEnd: 26,
                prefix: 'Email:',
                suffix: 'Phone:',
                occurrence: 0,
                required: false,
                transform: 'Email',
              }],
              requiredFields: [],
              confidenceThreshold: 0.82,
            },
          }],
        };
      }
      if (sql.includes('INSERT INTO tenant_lead(')) {
        return { rowCount: 1, rows: [{ id: 47, full_name: 'Norah Bec' }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'leads@email.realtor.com',
      subject: 'New lead',
      body: 'Email: norah.bec@gmail.com\nPhone: 786-252-6727',
      receivedAt: new Date('2026-08-18T00:00:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: true, lead: { id: 47 } });
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    const insertParams = (insertCall as unknown[])[1] as unknown[];
    expect(insertParams[0]).toBe('Norah Bec');
  });

  test('re-derives a wrong lead name from the stored email during backfill', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("OR full_name = 'Inbound lead'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 21,
            full_name: '7862526727',
            email: 'norah.bec@gmail.com',
            phone: '7862526727',
            payload: {
              latestEmailSubject: 'New lead',
              latestEmailBody: 'Email: norah.bec@gmail.com\nPhone: 7862526727',
            },
          }],
        };
      }
      if (sql.includes('SET full_name = $2')) {
        return { rowCount: 1, rows: [{ id: 21 }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService({} as any, databases as any, {} as any);

    const result = await (service as any).fixMissingLeadNames({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.fixed).toBe(1);
    const updateCall = query.mock.calls.find(
      (call: unknown[]) => String(call[0]).includes('SET full_name = $2'),
    );
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown[])[1] as unknown[];
    expect(params[1]).toBe('Norah Bec');
  });

  test('backfill drops a provider address email and adds the country code to the phone', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("OR full_name = 'Inbound lead'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 22,
            full_name: 'Inbound lead',
            email: 'leads@email.realtor.com',
            phone: '3058792145',
            payload: {
              latestEmailSubject: 'com lead - Johny Tobon',
              latestEmailBody: 'Name: Johny Tobon\nPhone: 3058792145',
              htmlBody: '<p>Reply to <a href="mailto:johnyalto@hotmail.com">johnyalto@hotmail.com</a></p>',
              inboundReplyAddress: 'leads@email.realtor.com',
            },
          }],
        };
      }
      if (sql.includes("key = 'agency_workspace_settings'")) {
        return {
          rowCount: 1,
          rows: [{ value: { profile: { defaultPhoneCountry: 'US' } } }],
        };
      }
      if (sql.includes('SET full_name = $2')) {
        return { rowCount: 1, rows: [{ id: 22 }] };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService({} as any, databases as any, {} as any);

    const result = await (service as any).fixMissingLeadNames({
      databaseName: 'tenant_1_demo',
    } as any);
    expect(result.fixed).toBe(1);
    const updateCall = query.mock.calls.find(
      (call: unknown[]) => String(call[0]).includes('SET full_name = $2'),
    );
    expect(updateCall).toBeDefined();
    const params = (updateCall as unknown[])[1] as unknown[];
    expect(params[1]).toBe('Johny Tobon');
    expect(params[2]).toBe('johnyalto@hotmail.com');
    expect(params[3]).toBe('+13058792145');
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

  test('syncGmail uses the last successful scan as the incremental window', async () => {
    const lastSucceededAt = new Date('2026-08-18T01:00:00Z');
    const databases = {
      withTenantClient: jest.fn(async (_db: string, callback: any) =>
        callback({
          query: jest.fn().mockResolvedValue({
            rowCount: 1,
            rows: [{ last_succeeded_at: lastSucceededAt }],
          }),
        }),
      ),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      {} as any,
    );
    jest.spyOn(service as any, 'gmailAccessToken').mockResolvedValue('token');
    const list = jest
      .spyOn(service as any, 'gmailMessagesForConfiguredTags')
      .mockResolvedValue([]);
    jest.spyOn(service as any, 'markStarted').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'markCompleted').mockResolvedValue(undefined);

    await (service as any).syncGmail(
      'tenant_1_demo',
      {
        gmailEmail: 'mailbox@example.com',
        mailboxTag: 'Leads',
        maxMessagesPerSync: 50,
      },
      { databaseName: 'tenant_1_demo' } as any,
    );

    expect(list).toHaveBeenCalledWith(
      'token',
      'Leads',
      50,
      lastSucceededAt.getTime(),
    );
  });

  test('a market-update email matching a template does not create a junk lead', async () => {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'lead-collection-templates'")) {
        return {
          rowCount: 1,
          rows: [{
            id: 15,
            payload: {
              name: 'Untitled lead email template',
              senderPatterns: ['*@mail.zillow.com'],
              subjectPattern: 'New listing for rent',
              subjectMatchMode: 'Contains',
              sourceHtml: '<p>2851 W Prospect Rd Unit 704</p>',
              sourceText: '',
              mappings: [],
              requiredFields: [],
              confidenceThreshold: 0.5,
            },
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);

    const parsed = await (service as any).createOrMatchLeadFromTemplate({ query }, {
      sender: 'market-updates@mail.zillow.com',
      subject: 'New listing for rent in Tamarac for $3,300/mo - 2851 W Prospect Rd Unit 704',
      body: 'Typical home value $289,970\n98101 2006 2026',
      receivedAt: new Date('2026-08-17T23:54:00Z'),
      mailboxTag: 'leads',
      leadTemplateTags: [],
      payload: {},
    });

    expect(parsed).toMatchObject({ created: false, lead: null });
    expect(parsed.result.matched).toBe(false);
    const insertCall = query.mock.calls.find(
      (call: unknown[]) =>
        String(call[0]).includes('INSERT INTO tenant_lead('),
    );
    expect(insertCall).toBeUndefined();
  });

  test('removes only invalid low-confidence placeholder leads', async () => {
    const query = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 77 }] });
    const databases = {
      withTenantClient: jest.fn((_database: string, callback: any) => callback({ query })),
    };
    const service = new TenantInboxSyncService({} as any, databases as any, {} as any);

    await expect((service as any).removeInvalidAutoCreatedLeads({
      databaseName: 'tenant_1_demo',
    })).resolves.toEqual({ removed: 1 });

    expect(query).toHaveBeenCalledWith(expect.stringContaining(
      "lower(trim(COALESCE(l.full_name, ''))) = 'inbound lead'",
    ));
    expect(query).toHaveBeenCalledWith(expect.stringContaining(
      "leadCollectionConfidence', '')::numeric, 0) < 0.6",
    ));
    expect(query).toHaveBeenCalledWith(expect.stringContaining(
      "outgoing.direction <> 'Incoming'",
    ));
  });

  test('a failing message does not block newer emails from being processed', async () => {
    const service = new TenantInboxSyncService(
      {} as any,
      { withTenantClient: jest.fn() } as any,
      {} as any,
    );
    jest.spyOn(service as any, 'gmailAccessToken').mockResolvedValue('token');
    jest.spyOn(service as any, 'gmailMessagesForConfiguredTags').mockResolvedValue([
      { id: 'msg-2', mailboxTag: 'Leads' },
      { id: 'msg-1', mailboxTag: 'Leads' },
    ]);
    jest.spyOn(service as any, 'markStarted').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'jsonRequest').mockResolvedValue({
      payload: { headers: [{ name: 'From', value: 'lead@example.com' }] },
      internalDate: 1786999000000,
      labelIds: ['INBOX'],
    });
    jest
      .spyOn(service as any, 'gmailBodies')
      .mockResolvedValue({ text: 'Hello', html: '' });
    const storeInbound = jest
      .spyOn(service as any, 'storeInbound')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        imported: 1, matched: 0, created: 1, skipped: 0, reason: '',
      });
    const markCompleted = jest
      .spyOn(service as any, 'markCompleted')
      .mockResolvedValue(undefined);

    const stats = await (service as any).syncGmail(
      'tenant_1_demo',
      { gmailEmail: 'mailbox@example.com', mailboxTag: 'Leads', maxMessagesPerSync: 50 },
      { databaseName: 'tenant_1_demo' } as any,
    );

    expect(storeInbound).toHaveBeenCalledTimes(2);
    expect(stats.skipped).toBe(1);
    expect(stats.imported).toBe(1);
    expect(markCompleted).toHaveBeenCalled();
  });

  test('manual syncGmail uses the full 14-day window regardless of the watermark', async () => {
    const databases = {
      withTenantClient: jest.fn(async (_db: string, callback: any) =>
        callback({
          query: jest.fn().mockResolvedValue({
            rowCount: 1,
            rows: [{ last_succeeded_at: new Date('2026-08-18T01:00:00Z') }],
          }),
        }),
      ),
    };
    const service = new TenantInboxSyncService(
      {} as any,
      databases as any,
      {} as any,
    );
    jest.spyOn(service as any, 'gmailAccessToken').mockResolvedValue('token');
    const list = jest
      .spyOn(service as any, 'gmailMessagesForConfiguredTags')
      .mockResolvedValue([]);
    jest.spyOn(service as any, 'markStarted').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'markCompleted').mockResolvedValue(undefined);

    await (service as any).syncGmail(
      'tenant_1_demo',
      { gmailEmail: 'mailbox@example.com', mailboxTag: 'Leads', maxMessagesPerSync: 50 },
      { databaseName: 'tenant_1_demo' } as any,
      true,
    );

    // fullWindow=true -> lastScan 0 -> the caller falls back to newer_than:14d
    expect(list).toHaveBeenCalledWith('token', 'Leads', 50, 0);
  });

  test('custom Gmail label sync includes archived messages outside INBOX', async () => {
    const service = new TenantInboxSyncService({} as any, {} as any, {} as any);
    const request = jest.spyOn(service as any, 'jsonRequest').mockResolvedValue({
      messages: [{ id: 'archived-realtor-lead' }],
    });

    await expect((service as any).listGmailMessagesForLabel(
      'token',
      'Label_Leads',
      'Leads',
      50,
      0,
    )).resolves.toEqual([{ id: 'archived-realtor-lead', mailboxTag: 'Leads' }]);

    const requestedUrl = new URL(String(request.mock.calls[0][0]));
    expect(requestedUrl.searchParams.getAll('labelIds')).toEqual(['Label_Leads']);
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
