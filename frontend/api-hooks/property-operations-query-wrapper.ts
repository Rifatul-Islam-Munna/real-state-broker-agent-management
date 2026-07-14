"use client"

import { type QueryKey, useQuery, type UseQueryOptions } from "@tanstack/react-query"
import { getRequest } from "./property-operations-api"

export function useQueryWrapper<TQueryFnData, TData = TQueryFnData>(
  key: QueryKey,
  url: string,
  options?: Omit<UseQueryOptions<TQueryFnData, Error, TData>, "queryKey" | "queryFn">,
) {
  return useQuery<TQueryFnData, Error, TData>({
    queryKey: key,
    queryFn: async () => {
      const [data, error] = await getRequest<TQueryFnData>(url)
      if (error) throw new Error(error.message)
      return data as TQueryFnData
    },
    ...options,
  })
}
