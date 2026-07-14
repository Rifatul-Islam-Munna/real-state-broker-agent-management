// @ts-nocheck
export type ApiSuccessResponse<T> = {
  statusCode: number
  message: string
  data: T
}

export type PaginatedResult<T> = {
  data?: T[]
  total?: number
  page?: number
  limit?: number
  totalPages?: number
}
