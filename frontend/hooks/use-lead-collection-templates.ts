"use client"

import { keepPreviousData, useQueryClient } from "@tanstack/react-query"

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import type {
  LeadCollectionLeadField,
  LeadCollectionParseResult,
  LeadCollectionPreparedSource,
  LeadCollectionTemplateItem,
  LeadCollectionTemplateList,
  LeadCollectionTemplateSaveInput,
} from "@/@types/lead-collection-template"

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

function useInvalidateLeadCollectionTemplates() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["lead-collection-templates"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-collection-template"] }),
      queryClient.invalidateQueries({ queryKey: ["mail-inbox"] }),
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
    ])
}

export function useLeadCollectionTemplates(params?: QueryParams) {
  return useQueryWrapper<LeadCollectionTemplateList>(
    ["lead-collection-templates", params],
    `/lead-collection-templates${buildQuery(params)}`,
    defaultQueryOptions,
  )
}

export function useLeadCollectionTemplate(id?: number) {
  return useQueryWrapper<LeadCollectionTemplateItem>(
    ["lead-collection-template", id],
    `/lead-collection-templates${buildQuery({ id })}`,
    {
      ...defaultQueryOptions,
      enabled: Boolean(id),
      placeholderData: undefined,
    },
  )
}

export function useLeadCollectionFields() {
  return useQueryWrapper<LeadCollectionLeadField[]>(
    ["lead-collection-template-fields"],
    "/lead-collection-templates/fields",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
      staleTime: 5 * 60_000,
    },
  )
}

export function usePrepareLeadCollectionSource() {
  return useCommonMutationApi<LeadCollectionPreparedSource, Record<string, unknown>>({
    method: "POST",
    url: "/lead-collection-templates/prepare-source",
  })
}

export function useTestLeadCollectionTemplate() {
  return useCommonMutationApi<
    LeadCollectionParseResult,
    LeadCollectionTemplateSaveInput & {
      testFromAddress?: string
      testSubject?: string
      testHtml?: string
      testText?: string
    }
  >({
    method: "POST",
    url: "/lead-collection-templates/test",
  })
}

export function useCreateLeadCollectionTemplate() {
  const invalidate = useInvalidateLeadCollectionTemplates()
  return useCommonMutationApi<LeadCollectionTemplateItem, LeadCollectionTemplateSaveInput>({
    method: "POST",
    url: "/lead-collection-templates",
    successMessage: "Lead collection template created",
    onSuccess: () => void invalidate(),
  })
}

export function useUpdateLeadCollectionTemplate() {
  const invalidate = useInvalidateLeadCollectionTemplates()
  return useCommonMutationApi<LeadCollectionTemplateItem, LeadCollectionTemplateSaveInput>({
    method: "PATCH",
    url: "/lead-collection-templates",
    successMessage: "Lead collection template updated",
    onSuccess: () => void invalidate(),
  })
}

export function useDeleteLeadCollectionTemplate() {
  const invalidate = useInvalidateLeadCollectionTemplates()
  return useCommonMutationApi<void, { id: number }>({
    method: "DELETE",
    url: "/lead-collection-templates",
    successMessage: "Lead collection template deleted",
    onSuccess: () => void invalidate(),
  })
}
