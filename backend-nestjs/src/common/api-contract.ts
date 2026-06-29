export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export function toInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
}

export function paginated<T>(items: T[], totalCount: number, page: number, pageSize: number): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}
