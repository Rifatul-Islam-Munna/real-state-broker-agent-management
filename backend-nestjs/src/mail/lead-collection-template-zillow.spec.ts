import { LeadCollectionTemplateService } from './lead-collection-template.service';

describe('LeadCollectionTemplateService Zillow link enrichment', () => {
  function createService() {
    return new LeadCollectionTemplateService(
      {} as any,
      {} as any,
      {} as any,
    );
  }

  test('keeps likely Zillow lead detail links and excludes unrelated links', () => {
    const service = createService();
    const links = (service as any).extractZillowLinks({
      fromAddress: 'leads@zillow.com',
      subject: 'New Zillow lead',
      htmlBody: [
        '<a href="https://www.zillow.com/premier-agent/lead-detail/abc123">View lead</a>',
        '<a href="https://www.zillow.com/privacy/">Privacy</a>',
        '<a href="https://example.com/private-lead">Other site</a>',
      ].join(''),
      textBody: '',
    });

    expect(links).toEqual([
      'https://www.zillow.com/premier-agent/lead-detail/abc123',
    ]);
  });

  test('recognizes Zillow templates by provider and sender information', () => {
    const service = createService();
    const template = {
      name: 'Portal inquiry',
      providerName: 'Zillow',
      senderPatterns: ['*@zillow.com'],
    };

    expect(
      (service as any).isZillowTemplate(template, {
        fromAddress: 'leads@zillow.com',
        subject: 'New contact request',
      }),
    ).toBe(true);
  });
});
