import { extractLinkedPageStructuredText } from './linked-page-structured-text';

describe('linked page structured text', () => {
  test('reads mapped values from embedded JSON data', () => {
    const html = `
      <script id="__NEXT_DATA__" type="application/json">
        {"props":{"lead":{"fullName":"Sample Person","telephone":"5550102200","propertyAddress":"44 Sample Road"}}}
      </script>
    `;
    const text = extractLinkedPageStructuredText(html);
    expect(text).toContain('fullName: Sample Person');
    expect(text).toContain('telephone: 5550102200');
    expect(text).toContain('propertyAddress: 44 Sample Road');
  });
});
