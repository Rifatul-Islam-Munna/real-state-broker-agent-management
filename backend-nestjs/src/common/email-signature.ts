import { BadRequestException } from '@nestjs/common';
import { convert } from 'html-to-text';
import sanitizeHtml from 'sanitize-html';

const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_HTML_LENGTH = 100_000;

export type EmailSignatureSettings = {
  emailSignatureEnabled?: boolean;
  emailSignatureHtml?: string;
  emailSignatureText?: string;
  emailSignatureImageUrl?: string;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function safeImageUrl(value: string) {
  if (/^data:image\/(?:png|jpeg|gif|webp);base64,[a-zA-Z0-9+/]+={0,2}$/.test(value)) {
    const bytes = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64');
    return bytes.length <= MAX_IMAGE_BYTES ? value : '';
  }
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href : '';
  } catch {
    return '';
  }
}

export function sanitizeEmailSignatureHtml(value: unknown): string {
  const html = String(value ?? '');
  if (html.length > MAX_HTML_LENGTH) {
    throw new BadRequestException('Email signature is too long.');
  }
  const length = /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))$/;
  const spacing = /^(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))(?:\s+(?:0|\d+(?:\.\d+)?(?:px|pt|em|rem|%))){0,3}$/;
  const color = /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\([\d.,%\s]+\))$/i;
  return sanitizeHtml(html, {
    allowedTags: ['div', 'p', 'span', 'br', 'b', 'strong', 'i', 'em', 'u', 's',
      'a', 'img', 'font', 'table', 'tbody', 'thead', 'tr', 'td', 'th', 'ul', 'ol', 'li'],
    allowedAttributes: {
      '*': ['style', 'align'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
      font: ['face', 'size', 'color'],
      table: ['cellpadding', 'cellspacing', 'border', 'width'],
      td: ['colspan', 'rowspan', 'width', 'valign'],
      th: ['colspan', 'rowspan', 'width', 'valign'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        color: [color], 'background-color': [color],
        'font-family': [/^[a-z0-9\s,'"_-]+$/i],
        'font-size': [length], 'font-weight': [/^(?:normal|bold|[1-9]00)$/],
        'font-style': [/^(?:normal|italic)$/],
        'text-decoration': [/^(?:none|underline|line-through)$/],
        'text-align': [/^(?:left|right|center|justify)$/],
        'vertical-align': [/^(?:top|middle|bottom|baseline)$/],
        'white-space': [/^(?:normal|pre|pre-wrap|pre-line)$/],
        display: [/^(?:block|inline|inline-block|table|table-row|table-cell)$/],
        width: [length, /^auto$/], height: [length, /^auto$/],
        'max-width': [length], 'max-height': [length],
        'line-height': [length, /^\d+(?:\.\d+)?$/],
        margin: [spacing], padding: [spacing],
        'margin-top': [length], 'margin-bottom': [length],
        'margin-left': [length], 'margin-right': [length],
        'padding-top': [length], 'padding-bottom': [length],
        'padding-left': [length], 'padding-right': [length],
        'border-collapse': [/^(?:collapse|separate)$/],
      },
    },
    transformTags: {
      img: (tagName, attributes) => {
        const src = safeImageUrl(attributes.src ?? '');
        return { tagName, attribs: { ...attributes, src } };
      },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
    nestingLimit: 20,
  });
}

export function signatureHtmlToText(html: string) {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
    ],
  });
}

export function normalizeEmailSignature(input: EmailSignatureSettings): Required<EmailSignatureSettings> {
  const html = sanitizeEmailSignatureHtml(input.emailSignatureHtml);
  const text = html ? signatureHtmlToText(html) : String(input.emailSignatureText ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (text.length > 10_000) throw new BadRequestException('Signature text must be 10000 characters or fewer.');
  const image = String(input.emailSignatureImageUrl ?? '').trim();
  if (image.length > 300_000 || (image && !safeImageUrl(image))) {
    throw new BadRequestException('Use a PNG, JPEG, GIF, or WebP signature image up to 200 KB, or a public image URL.');
  }
  return {
    emailSignatureEnabled: input.emailSignatureEnabled === true,
    emailSignatureHtml: html,
    emailSignatureText: text,
    emailSignatureImageUrl: image,
  };
}

export function emailSignatureContent(input: EmailSignatureSettings) {
  if (input.emailSignatureEnabled !== true) return { html: '', text: '' };
  const value = normalizeEmailSignature(input);
  let html = value.emailSignatureHtml;
  if (!html && value.emailSignatureText.trim()) {
    html = `<div style="white-space:pre-wrap">${escapeHtml(value.emailSignatureText).replace(/\r\n|\r|\n/g, '<br>')}</div>`;
  }
  if (value.emailSignatureImageUrl) {
    html += `<div><img src="${escapeHtml(value.emailSignatureImageUrl)}" alt="Signature" style="display:block;max-width:320px;height:auto" width="320"></div>`;
  }
  return { html, text: value.emailSignatureText };
}
