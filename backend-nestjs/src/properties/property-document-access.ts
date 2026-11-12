/**
 * Property documents created before visibility was introduced had no access
 * flag. Treat those as private; only an explicit Public value is publishable.
 */
export type PropertyDocumentAccessLevel = 'Public' | 'AdminOnly';

export function propertyDocumentAccessLevel(value: unknown): PropertyDocumentAccessLevel {
  return value === 'Public' ? 'Public' : 'AdminOnly';
}

export function publicPropertyDocuments<T extends { accessLevel?: unknown; fileUrl?: unknown }>(
  documents: T[] | null | undefined,
): T[] {
  return (Array.isArray(documents) ? documents : []).filter(
    (document) =>
      document?.accessLevel === 'Public' &&
      typeof document.fileUrl === 'string' &&
      document.fileUrl.trim().length > 0,
  );
}
