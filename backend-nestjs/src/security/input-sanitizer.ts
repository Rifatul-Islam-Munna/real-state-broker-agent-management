import { BadRequestException } from '@nestjs/common';

export function sanitizePlainText(value: unknown, field: string, maxLength: number, options: { required?: boolean; collapseWhitespace?: boolean } = {}) {
  const raw = `${value ?? ''}`;
  const withoutControls = raw.replace(/[\u0000-\u001F\u007F]/g, '');
  const withoutMarkup = withoutControls.replace(/[<>]/g, '');
  const normalized = options.collapseWhitespace === false ? withoutMarkup.trim() : withoutMarkup.trim().replace(/\s+/g, ' ');
  if (options.required && !normalized) throw new BadRequestException(`${field} is required`);
  if (normalized.length > maxLength) throw new BadRequestException(`${field} must be ${maxLength} characters or fewer`);
  return normalized;
}

export function validatePurchaseReference(value: unknown) {
  if (!`${value ?? ''}`.trim()) throw new BadRequestException('A successful purchase reference is required');
  const reference = sanitizePlainText(value, 'Purchase reference', 160);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/.test(reference)) {
    throw new BadRequestException('Purchase reference contains invalid characters');
  }
  return reference;
}
