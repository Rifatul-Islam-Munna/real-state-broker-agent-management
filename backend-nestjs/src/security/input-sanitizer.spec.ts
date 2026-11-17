import { sanitizePlainText, validatePurchaseReference } from './input-sanitizer';

describe('input sanitizer', () => {
  it('removes control characters and markup delimiters while preserving useful text', () => {
    expect(sanitizePlainText('  Blue\u0000 <Realty>  ', 'Business name', 160, { required: true })).toBe('Blue Realty');
  });

  it('enforces required and maximum-length rules', () => {
    expect(() => sanitizePlainText('   ', 'Name', 10, { required: true })).toThrow('Name is required');
    expect(() => sanitizePlainText('12345678901', 'Name', 10)).toThrow('10 characters or fewer');
  });

  it('preserves message whitespace while removing unsafe controls', () => {
    const body = '\n  Hello Owner,\r\n\r\n\t[ 3 ] Inquiries  \r\n\r\nBest regards,\n\n';
    expect(sanitizePlainText(body + '\u0000\u0007\u007F', 'Body', 200, {
      collapseWhitespace: false,
    })).toBe(body);
    expect(() => sanitizePlainText(' \r\n\t ', 'Body', 200, {
      required: true,
      collapseWhitespace: false,
    })).toThrow('Body is required');
    expect(() => sanitizePlainText(' \n12345', 'Body', 5, {
      collapseWhitespace: false,
    })).toThrow('5 characters or fewer');
  });

  it('accepts safe purchase references and rejects scripts or whitespace', () => {
    expect(validatePurchaseReference('PAY-2026_ABC:1')).toBe('PAY-2026_ABC:1');
    expect(() => validatePurchaseReference('<script>alert(1)</script>')).toThrow('invalid characters');
    expect(() => validatePurchaseReference('PAY 2026')).toThrow('invalid characters');
  });
});
