// @ts-nocheck
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"

import { GetRequestNormal } from "./api-hooks"

export function useQueryWrapper<T>(
  key: QueryKey,
  url: string,
  options?: Omit<UseQueryOptions<T, Error, T>, "queryKey" | "queryFn">,
  revalidate?: number,
  tag?: string,
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: () => GetRequestNormal<T>(url, revalidate, tag),
    ...options,
  })
}