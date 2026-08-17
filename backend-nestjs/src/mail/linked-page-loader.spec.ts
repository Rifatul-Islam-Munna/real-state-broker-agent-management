import {
  extractConfiguredLinkedPageLinks,
  extractLinkedLeadTextFromUrl,
  loadConfiguredLinkedPage,
} from './linked-page-loader';
import { normalizeLinkedPageConfig } from './linked-page-config';

describe('linked page loader', () => {
  test('extracts approved detail links from buttons and tracking redirects', () => {
    const config = normalizeLinkedPageConfig({
      enabled: true,
      allowedHosts: ['zillow.com', '*.zillow.com'],
      urlIncludes: ['lead'],
    });
    const input = {
      fromAddress: 'leads@example.com',
      subject: 'New lead',
      htmlBody: `
        <a href="https://tracker.example.com/click?url=https%3A%2F%2Fwww.zillow.com%2Flead%2F123">View lead</a>
        <form action="https://www.zillow.com/lead/456"><button>Open</button></form>
      `,
    };

    expect(extractConfiguredLinkedPageLinks(input, config).map((item) => item.url)).toEqual([
      'https://www.zillow.com/lead/123',
      'https://www.zillow.com/lead/456',
    ]);
  });

  test('turns Zillow inquiry URL fields into mappable lead text', () => {
    const text = extractLinkedLeadTextFromUrl(
      'https://www.zillow.com/rental-manager/inquiry-contact?controlHash=abc123&date=07%2F15%2F26&inquiryId=9107&name=bradley%20weneck&phone=754-223-9582&ref=inquiry',
    );

    expect(text).toContain('Name: bradley weneck');
    expect(text).toContain('Phone: 754-223-9582');
    expect(text).toContain('Control Hash: abc123');
    expect(text).toContain('Inquiry id: 9107');
  });

  test('uses current email button instead of saved sample button', async () => {
    const result = await loadConfiguredLinkedPage(
      {
        fromAddress: 'new-lead@convo.zillow.com',
        subject: 'Jean is requesting an application',
        htmlBody:
          '<a href="https://www.zillow.com/rental-manager/inquiry-contact?name=Jean%20Melo&phone=954-555-0102">Send application</a>',
      },
      {
        enabled: true,
        allowedHosts: ['zillow.com', '*.zillow.com'],
        urlIncludes: ['inquiry-contact'],
        linkTextIncludes: [],
        maxLinks: 3,
        openPage: false,
        autoFillContactFields: true,
        selectedUrl:
          'https://www.zillow.com/rental-manager/inquiry-contact?name=Danish%20Liaqat&phone=419-9734-11',
      },
    );

    expect(result?.text).toContain('Name: Jean Melo');
    expect(result?.text).toContain('Phone: 954-555-0102');
    expect(result?.text).not.toContain('Danish Liaqat');
  });
});
