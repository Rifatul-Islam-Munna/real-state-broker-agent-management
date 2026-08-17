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
