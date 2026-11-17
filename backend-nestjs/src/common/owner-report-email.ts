function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function ownerReportBodyHtml(value: string, propertyAddresses: unknown[] = []) {
  const body = String(value ?? '');
  const addresses = new Set<string>();
  for (const address of propertyAddresses) {
    if (typeof address === 'string' && address.trim() && address.length <= 500) addresses.add(address.trim());
  }
  // Imported and older reports may not carry the property's address metadata.
  const streetAddress = /\b\d{1,6}[ \t]+(?:[a-z0-9.,'&#/-]+[ \t]+){0,10}(?:street|st|drive|dr|road|rd|avenue|ave|way|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|terrace|ter|trail|trl|parkway|pkwy)\b\.?(?:[ \t]+(?:unit|apt|apartment|suite|ste|#)[ \t]*#?[ \t]*[a-z0-9-]+)?/gi;
  for (const match of body.matchAll(streetAddress)) addresses.add(match[0]);
  let html = '';
  let offset = 0;
  if (addresses.size) {
    const pattern = [...addresses].sort((a, b) => b.length - a.length)
      .map((address) => address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    for (const match of body.matchAll(new RegExp(pattern, 'gi'))) {
      html += escapeHtml(body.slice(offset, match.index));
      // Own the anchor before Gmail's data detector runs. Its only destination
      // is this message's fragment, never Maps. Inline styles survive clients
      // that discard the scoped stylesheet. Keep text free of invisible chars.
      html += `<span class="owner-report-address"><a href="#" tabindex="-1" style="color:inherit !important;text-decoration:none !important;pointer-events:none !important;cursor:text !important">${escapeHtml(match[0])}</a></span>`;
      offset = match.index + match[0].length;
    }
  }
  html += escapeHtml(body.slice(offset));
  return `<div style="white-space:pre-wrap;font-family:Arial,sans-serif">${html.replace(/\r\n|\r|\n/g, '<br>')}</div>`;
}

export function ownerReportEmailDocument(contentHtml: string) {
  // Scope all overrides to property addresses; signature email/phone/web links
  // retain their normal appearance and behavior.
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="format-detection" content="address=no"><style type="text/css">.owner-report-address,.owner-report-address a{color:inherit !important;text-decoration:none !important;font-family:inherit !important;font-size:inherit !important;font-weight:inherit !important;line-height:inherit !important;pointer-events:none !important;cursor:text !important}</style></head><body style="margin:0;padding:0">${contentHtml}</body></html>`;
}
