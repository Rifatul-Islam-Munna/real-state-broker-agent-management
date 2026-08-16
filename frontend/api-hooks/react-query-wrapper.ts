import {
  type QueryKey,
  useQuery,
  type UseQueryOptions,
} from "@tanstack/react-query"

import { GetRequestNormal } from "./api-hooks"

export function useQueryWrapper<TQueryFnData, TData = TQueryFnData>(
  key: QueryKey,
  url: string,
  options?: Omit<
    UseQueryOptions<TQueryFnData, Error, TData>,
    "queryKey" | "queryFn"
  >,
  revalidate?: number,
  tag?: string
) {
  return useQuery<TQueryFnData, Error, TData>({
    queryKey: key,
    queryFn: () => GetRequestNormal<TQueryFnData>(url, revalidate, tag),
    ...options,
  })
}
