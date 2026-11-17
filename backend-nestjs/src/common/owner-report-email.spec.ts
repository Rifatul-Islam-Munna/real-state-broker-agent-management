import { convert } from 'html-to-text';
import { ShowingFeedbackService } from '../showing-feedback/showing-feedback.service';
import { ShowingFeedbackQueryService } from '../showing-feedback/showing-feedback-query.service';
import { ownerReportBodyHtml, ownerReportEmailDocument } from './owner-report-email';

jest.mock('../settings/ai-json-client.service', () => ({ AiJsonClientService: class {} }));
jest.mock('../settings/settings.service', () => ({ SettingsService: class {} }));
jest.mock('../sms/sms.service', () => ({ SmsService: class {} }));

describe('Owner report address rendering', () => {
  it.each([
    '2500 Parkview Dr Unit#1216',
    '2600 S University Dr Unit #228',
    '12 Lake Street Apt 4',
  ])('gives %s a neutral target and plain text styling, without invisible characters', (address) => {
    const body = `Here is your weekly activity report ${address}.`;
    const html = ownerReportBodyHtml(body);
    expect(html).toContain(`>${address}</a></span>.`);
    const anchors = [...html.matchAll(/<a\b([^>]*)>/g)];
    expect(anchors).toHaveLength(1);
    expect(anchors[0][1]).toContain('href="#"');
    expect(anchors[0][1]).toContain('text-decoration:none !important');
    expect(anchors[0][1]).toContain('color:inherit !important');
    expect(html).not.toMatch(/&#8204;|\u200c|maps\.google|google\.com\/maps/);
    expect(convert(html, { wordwrap: false, selectors: [{ selector: 'a', options: { ignoreHref: true } }] })).toBe(body);
  });

  it('matches literal property metadata, including regex punctuation and HTML characters', () => {
    const address = '12 A&B Place (Unit #4)';
    const html = ownerReportBodyHtml(`Hello,\n\n${address}\n\n${address}`, [address]);
    expect(html.match(/class="owner-report-address"/g)).toHaveLength(2);
    expect(html).toContain('12 A&amp;B Place (Unit #4)</a></span><br><br>');
    expect(html).not.toMatch(/&#8204;|\u200c/);
  });

  it('preserves whitespace and escapes body markup', () => {
    expect(ownerReportBodyHtml('\n  Hello <Owner>,\r\n\r\n\t[ 3 ] Inquiries  \n'))
      .toBe('<div style="white-space:pre-wrap;font-family:Arial,sans-serif"><br>  Hello &lt;Owner&gt;,<br><br>\t[ 3 ] Inquiries  <br></div>');
  });

  it('keeps Gmail-compatible styles in the document head and leaves signature links intact', () => {
    const html = ownerReportEmailDocument(ownerReportBodyHtml('12 Lake Street') + '<a href="mailto:agent@example.com">Email</a><a href="tel:+15555550123">Phone</a>');
    expect(html).toMatch(/^<!doctype html><html><head>/);
    expect(html).toContain('content="address=no"');
    expect(html).toContain('.owner-report-address a{color:inherit !important;');
    expect(html).toContain('<a href="mailto:agent@example.com">Email</a>');
    expect(html).toContain('<a href="tel:+15555550123">Phone</a>');
    expect(html).not.toMatch(/body a\s*\{|google\.com\/maps/);
  });
});

describe('Owner report SMTP delivery paths', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['showing feedback', ShowingFeedbackService],
    ['showing feedback query', ShowingFeedbackQueryService],
  ])('uses protected address HTML in %s, including reports without queue metadata', async (_name, Service) => {
    const body = 'Here is your weekly activity report 2500 Parkview Dr Unit#1216.\n\n  [ 0 ] Inquiries';
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'report' });
    jest.spyOn(require('nodemailer'), 'createTransport').mockReturnValue({ sendMail });
    const settingsService = { getSmtpConfig: jest.fn().mockResolvedValue({
      host: 'smtp.example.com', username: 'agent@example.com', password: 'test-password',
    }) };
    await (Service.prototype as any).sendEmail.call(
      { settingsService }, 'owner@example.com', 'Owner report', body,
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.text).toBe(body);
    expect(message.html).toContain('class="owner-report-address"><a href="#"');
    expect(message.html).toContain('>2500 Parkview Dr Unit#1216</a></span>.');
    expect(message.html).toContain('.owner-report-address a{color:inherit !important;');
    expect(message.html).not.toMatch(/google\.com\/maps|&#8204;/);
  });
});
