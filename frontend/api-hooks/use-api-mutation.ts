// @ts-nocheck
import { useMutation } from "@tanstack/react-query"
import { sileo } from "sileo"

import { DeleteRequestAxios, PatchRequestAxios, PostRequestAxios } from "./api-hooks"

type HttpMethod = "POST" | "PATCH" | "DELETE"

interface UseApiMutationConfig<TData = any, TVariables = any> {
  url: string
  method: HttpMethod
  mutationKey?: string[]
  successMessage?: string
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export function useCommonMutationApi<TData = any, TVariables = any>(
  config: UseApiMutationConfig<TData, TVariables>,
) {
  const { url, method, mutationKey, successMessage, onSuccess, onError } = config

  const getMutationFn = () => {
    switch (method) {
      case "POST":
        return async (data: TVariables) => {
          const [response, error] = await PostRequestAxios<TData>(url, data)
          return { data: response, error }
        }
      case "PATCH":
        return async (data: TVariables) => {
          const [response, error] = await PatchRequestAxios<TData>(url, data)
          return { data: response, error }
        }
      case "DELETE":
        return async (variables: TVariables | string) => {
          const id = typeof variables === "string" ? variables : (variables as any)?.id
          const [response, error] = await DeleteRequestAxios<TData>(`${url}?id=${id}`)
          return { data: response, error }
        }
      default:
        throw new Error(`Unsupported method: ${method}`)
    }
  }

  return useMutation({
    mutationKey,
    mutationFn: async (variables: TVariables) => {
      const mutationFn = getMutationFn()
      return await mutationFn(variables as any)
    },
    onSuccess: (result) => {
      if (result?.data) {
        sileo.success({
          title: successMessage || "Success",
        })
        onSuccess?.(result.data)
        return
      }

      const message = result?.error?.message || "Unknown error"
      sileo.error({
        title: "Request failed",
        description: message,
      })
      onError?.({ message } as Error)
    },
    onError: (error: Error) => {
      sileo.error({
        title: "Request failed",
        description: error.message,
      })
      onError?.(error)
    },
  })
}