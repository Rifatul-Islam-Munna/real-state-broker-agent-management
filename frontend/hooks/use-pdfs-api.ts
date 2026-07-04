"use client"

import { keepPreviousData, useMutation, useQueryClient } from "@tanstack/react-query"
import { sileo } from "sileo"

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import type {
  PdfGenerateResult,
  PdfGenerationList,
  PdfResolveInput,
  PdfResolveResult,
  PdfTemplateItem,
  PdfTemplateList,
  PdfTemplateSaveInput,
  PdfVariableCatalog,
} from "@/@types/pdf-management"

type QueryParams = Record<string, string | number | boolean | undefined | null>

const defaultQueryOptions = {
  placeholderData: keepPreviousData,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: 30_000,
} as const

function buildQuery(params?: QueryParams) {
  const searchParams = new URLSearchParams()
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      searchParams.set(key, String(value))
    }
  })
  const query = searchParams.toString()
  return query ? `?${query}` : ""
}

function useInvalidatePdfQueries() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["pdf-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["pdf-template"] }),
      queryClient.invalidateQueries({ queryKey: ["pdf-generations"] }),
    ])
}

export function usePdfVariables(category?: string) {
  return useQueryWrapper<PdfVariableCatalog>(
    ["pdf-variables", category],
    `/pdfs/variables${buildQuery({ category })}`,
    { ...defaultQueryOptions, placeholderData: undefined },
  )
}

export function usePdfTemplates(params?: QueryParams) {
  return useQueryWrapper<PdfTemplateList>(
    ["pdf-templates", params],
    `/pdfs/templates${buildQuery(params)}`,
    defaultQueryOptions,
  )
}

export function usePdfTemplate(id?: number) {
  return useQueryWrapper<PdfTemplateItem>(
    ["pdf-template", id],
    `/pdfs/templates/detail${buildQuery({ id })}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(id),
      placeholderData: undefined,
    },
  )
}

export function useCreatePdfTemplate() {
  const invalidate = useInvalidatePdfQueries()
  return useCommonMutationApi<PdfTemplateItem, PdfTemplateSaveInput>({
    method: "POST",
    url: "/pdfs/templates",
    successMessage: "PDF template created",
    onSuccess: () => void invalidate(),
  })
}

export function useUpdatePdfTemplate() {
  const invalidate = useInvalidatePdfQueries()
  return useCommonMutationApi<PdfTemplateItem, PdfTemplateSaveInput>({
    method: "PATCH",
    url: "/pdfs/templates",
    successMessage: "PDF template updated",
    onSuccess: () => void invalidate(),
  })
}

export function useDeletePdfTemplate() {
  const invalidate = useInvalidatePdfQueries()
  return useCommonMutationApi<void, { id: number }>({
    method: "DELETE",
    url: "/pdfs/templates",
    successMessage: "PDF template deleted",
    onSuccess: () => void invalidate(),
  })
}

export function useResolvePdfTemplate() {
  return useCommonMutationApi<PdfResolveResult, PdfResolveInput>({
    method: "POST",
    url: "/pdfs/resolve",
  })
}

export function useGeneratePdf() {
  const invalidate = useInvalidatePdfQueries()
  return useCommonMutationApi<
    PdfGenerateResult,
    PdfResolveInput & { generatedBy?: string; allowMissing?: boolean }
  >({
    method: "POST",
    url: "/pdfs/generate",
    successMessage: "PDF generated",
    onSuccess: () => void invalidate(),
  })
}

export function usePdfGenerations(params?: QueryParams) {
  return useQueryWrapper<PdfGenerationList>(
    ["pdf-generations", params],
    `/pdfs/generations${buildQuery(params)}`,
    defaultQueryOptions,
  )
}

export function useDeletePdfGeneration() {
  const invalidate = useInvalidatePdfQueries()
  return useCommonMutationApi<void, { id: number }>({
    method: "DELETE",
    url: "/pdfs/generations",
    successMessage: "Generated PDF deleted",
    onSuccess: () => void invalidate(),
  })
}

export function useImportPdfTemplate() {
  const invalidate = useInvalidatePdfQueries()
  return useMutation<
    { data: PdfTemplateItem | null; error: { message: string; statusCode: number } | null },
    Error,
    FormData
  >({
    mutationKey: ["pdf-template-import"],
    mutationFn: async (formData) => {
      const response = await fetch("/api/proxy/pdfs/templates/import", {
        method: "POST",
        body: formData,
      })
      const text = await response.text()
      let payload: unknown = null
      try {
        payload = text ? JSON.parse(text) : null
      } catch {
        payload = text
      }
      if (!response.ok) {
        const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}
        const message = typeof record.message === "string" ? record.message : "Unable to import the PDF."
        return { data: null, error: { message, statusCode: response.status } }
      }
      return { data: payload as PdfTemplateItem, error: null }
    },
    onSuccess: (result) => {
      if (result.error) {
        sileo.error({ title: "Import failed", description: result.error.message })
        return
      }
      sileo.success({ title: "PDF imported" })
      void invalidate()
    },
  })
}
