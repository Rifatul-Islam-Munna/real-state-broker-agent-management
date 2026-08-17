import { TenantLegacyCompatibilityService } from './tenant-legacy-compatibility.service';

describe('TenantLegacyCompatibilityService lead collection compatibility', () => {
  let service: TenantLegacyCompatibilityService;

  beforeEach(() => {
    service = new TenantLegacyCompatibilityService(
      {} as any,
      {} as any,
      {} as any,
    );
  });

  test('returns usable tenant lead fields', () => {
    const fields = service.leadCollectionFields();
    expect(fields.some((field) => field.field === 'name')).toBe(true);
    expect(fields.some((field) => field.field === 'email')).toBe(true);
    expect(fields.some((field) => field.field === 'phone')).toBe(true);
    expect(fields.some((field) => field.field === 'creditScore')).toBe(true);
    expect(fields.some((field) => field.field === 'combinedCreditScore')).toBe(true);
    expect(fields.some((field) => field.field === 'monthlyEarning')).toBe(true);
    expect(fields.some((field) => field.field === 'combinedMonthlyEarning')).toBe(true);
  });

  test('prepares pasted email with a complete response shape', async () => {
    const prepared = await service.leadCollectionPrepareSource(
      { databaseName: 'tenant_test' } as any,
      {
        sourceType: 'PastedText',
        sourceText: 'Name: Jane Doe\nEmail: jane@example.com',
        sampleFromAddress: 'lead@zillow.com',
        sampleSubject: 'New Zillow lead',
        linkedPageConfig: { enabled: false },
      },
    );
    expect(prepared.sourceText).toContain('Name: Jane Doe');
    expect(prepared.linkedPageSourceText).toBe('');
    expect(prepared.linkedPageSourceHtml).toBe('');
    expect(prepared.linkedPageSampleUrl).toBe('');
    expect(prepared.linkedPageConfig.enabled).toBe(false);
    expect(prepared.senderPatterns).toContain('*@zillow.com');
  });

  test('tests a pasted template without undefined trim crashes', async () => {
    const result = await service.leadCollectionTest(
      { databaseName: 'tenant_test' } as any,
      {
        name: 'Zillow test',
        sourceType: 'PastedText',
        sourceText: 'Name: Jane Doe\nEmail: jane@example.com',
        sampleFromAddress: 'lead@zillow.com',
        sampleSubject: 'New Zillow lead',
        linkedPageConfig: { enabled: false },
        mappings: [
          {
            field: 'name',
            label: 'Name',
            sampleValue: 'Jane Doe',
            prefix: 'Name:',
            suffix: 'Email:',
            required: true,
            transform: 'Text',
          },
        ],
        requiredFields: ['name'],
      },
    );
    expect(result.values.name).toBe('Jane Doe');
    expect(result.missingRequiredFields).toEqual([]);
    expect(result.templateName).toBe('Zillow test');
  });
});
