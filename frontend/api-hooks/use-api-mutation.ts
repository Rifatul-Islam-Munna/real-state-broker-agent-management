import { useMutation } from "@tanstack/react-query"
import { sileo } from "sileo"

import {
  type ApiError,
  DeleteRequestAxios,
  PatchRequestAxios,
  PostRequestAxios,
} from "./api-hooks"

type HttpMethod = "POST" | "PATCH" | "DELETE"

type MutationResult<TData> = {
  data: TData | null
  error: ApiError | null
}

interface UseApiMutationConfig<TData, TVariables> {
  url: string
  method: HttpMethod
  mutationKey?: string[]
  successMessage?: string
  onSuccess?: (data: TData | null) => void
  onError?: (error: ApiError) => void
}

export function useCommonMutationApi<TData = unknown, TVariables = unknown>(
  config: UseApiMutationConfig<TData, TVariables>,
) {
  const { url, method, mutationKey, successMessage, onSuccess, onError } = config

  async function runMutation(variables: TVariables): Promise<MutationResult<TData>> {
    if (method === "POST") {
      const [data, error] = await PostRequestAxios<TData, TVariables>(url, variables)
      return { data, error }
    }

    if (method === "PATCH") {
      const [data, error] = await PatchRequestAxios<TData, TVariables>(url, variables)
      return { data, error }
    }

    const id =
      typeof variables === "string"
        ? variables
        : (variables as { id?: string | number } | null | undefined)?.id

    if (id === undefined || id === null || `${id}`.trim().length === 0) {
      return {
        data: null,
        error: { message: "A valid item ID is required.", statusCode: 400 },
      }
    }

    const [data, error] = await DeleteRequestAxios<TData>(
      `${url}?id=${encodeURIComponent(String(id))}`,
    )
    return { data, error }
  }

  return useMutation<MutationResult<TData>, Error, TVariables>({
    mutationKey,
    mutationFn: runMutation,
    onSuccess: (result) => {
      if (!result.error) {
        sileo.success({ title: successMessage || "Success" })
        onSuccess?.(result.data)
        return
      }

      sileo.error({
        title: "Request failed",
        description: result.error.message,
      })
      onError?.(result.error)
    },
    onError: (error) => {
      const apiError: ApiError = {
        message: error.message || "Something went wrong",
        statusCode: 500,
      }

      sileo.error({
        title: "Request failed",
        description: apiError.message,
      })
      onError?.(apiError)
    },
  })
}
