import { PdfsService } from './pdfs.service';

describe('PdfsService helpers', () => {
  const service = new PdfsService(
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
    null as never,
  );

  it('extracts every unique pdfme field name', () => {
    const variables = (service as any).extractTemplateVariables({
      schemas: [
        [{ name: 'property.title' }, { name: 'tenant.name' }],
        [{ name: 'property.title' }, { name: '' }],
      ],
    });

    expect(variables).toEqual(['property.title', 'tenant.name']);
  });

  it('resolves file-name variables and adds a PDF extension', () => {
    const fileName = (service as any).resolveFileName(
      'lease-{{property.slug}}-{{tenant.name}}',
      {
        'property.slug': 'lake-house',
        'tenant.name': 'Taylor Morgan',
      },
      'document',
    );

    expect(fileName).toBe('lease-lake-house-Taylor-Morgan.pdf');
  });

  it('converts imported checkbox fields to pdfme schemas', () => {
    const schema = (service as any).importedFieldSchema(
      'accepted_terms',
      'checkbox',
      { x: 10, y: 20, width: 8, height: 8 },
      [],
    );

    expect(schema).toMatchObject({
      name: 'accepted_terms',
      type: 'checkbox',
      content: 'false',
      position: { x: 10, y: 20 },
    });
  });

  it('keeps universal variable categories unrestricted', () => {
    const variables = [
      { key: 'system.current_date', label: 'Current date', group: 'System' },
      { key: 'property.title', label: 'Title', group: 'Property' },
      { key: 'tenant.name', label: 'Name', group: 'Tenant / applicant' },
    ];

    expect((service as any).filterVariablesByCategory(variables, 'Universal')).toEqual(
      variables,
    );
  });
});
