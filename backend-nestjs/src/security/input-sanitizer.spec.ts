import { sanitizePlainText, validatePurchaseReference } from './input-sanitizer';

describe('input sanitizer', () => {
  it('removes control characters and markup delimiters while preserving useful text', () => {
    expect(sanitizePlainText('  Blue\u0000 <Realty>  ', 'Business name', 160, { required: true })).toBe('Blue Realty');
  });

  it('enforces required and maximum-length rules', () => {
    expect(() => sanitizePlainText('   ', 'Name', 10, { required: true })).toThrow('Name is required');
    expect(() => sanitizePlainText('12345678901', 'Name', 10)).toThrow('10 characters or fewer');
  });

  it('accepts safe purchase references and rejects scripts or whitespace', () => {
    expect(validatePurchaseReference('PAY-2026_ABC:1')).toBe('PAY-2026_ABC:1');
    expect(() => validatePurchaseReference('<script>alert(1)</script>')).toThrow('invalid characters');
    expect(() => validatePurchaseReference('PAY 2026')).toThrow('invalid characters');
  });
});
