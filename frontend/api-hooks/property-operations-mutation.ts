"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sileo } from "sileo"
import { deleteRequest, patchRequest, postRequest, type ApiErrorShape } from "./property-operations-api"

type HttpMethod = "POST" | "PATCH" | "DELETE"

type Config<TData, TVariables> = {
  url: string
  method: HttpMethod
  mutationKey?: string[]
  invalidateKeys?: Array<readonly unknown[]>
  successMessage?: string
  onSuccess?: (data: TData | null) => void
  onError?: (error: ApiErrorShape) => void
}

export function useCommonMutationApi<TData = unknown, TVariables = unknown>(config: Config<TData, TVariables>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: config.mutationKey,
    mutationFn: async (variables: TVariables) => {
      let result: readonly [TData | null, ApiErrorShape | null]
      if (config.method === "POST") result = await postRequest<TData, TVariables>(config.url, variables)
      else if (config.method === "PATCH") result = await patchRequest<TData, TVariables>(config.url, variables)
      else {
        const id = typeof variables === "string" || typeof variables === "number"
          ? variables
          : (variables as { id?: string | number } | null | undefined)?.id
        const separator = config.url.includes("?") ? "&" : "?"
        result = await deleteRequest<TData>(id == null ? config.url : `${config.url}${separator}id=${encodeURIComponent(String(id))}`)
      }
      const [data, error] = result
      if (error) throw Object.assign(new Error(error.message), error)
      return data
    },
    onSuccess: async (data) => {
      sileo.success({ title: config.successMessage ?? "Saved" })
      for (const key of config.invalidateKeys ?? []) await queryClient.invalidateQueries({ queryKey: key })
      await queryClient.invalidateQueries({ queryKey: ["owner"] })
      config.onSuccess?.(data ?? null)
    },
    onError: (error) => {
      const apiError = { message: error instanceof Error ? error.message : "Request failed", statusCode: Number((error as { statusCode?: number }).statusCode ?? 500) }
      sileo.error({ title: "Request failed", description: apiError.message })
      config.onError?.(apiError)
    },
  })
}
