"use client"

import { keepPreviousData, useQueryClient } from "@tanstack/react-query"

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import type {
  AgencyCommunicationTemplateItem,
  LeadOutreachBulkDispatchInput,
  LeadOutreachBulkDispatchResult,
  LeadHistoryEntry,
  LeadOutreachDispatchInput,
  LeadOutreachScheduleItem,
} from "@/@types/real-estate-api"

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

function useInvalidate(keys: string[]) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })))
}

export function useLeadOutreachTemplates() {
  return useQueryWrapper<AgencyCommunicationTemplateItem[]>(
    ["lead-outreach-templates"],
    "/lead-outreach/templates",
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "lead-outreach-templates",
  )
}

export function useDispatchLeadOutreach() {
  const invalidate = useInvalidate(["lead-history", "lead-outreach-schedule", "lead", "leads"])

  return useCommonMutationApi<LeadHistoryEntry, LeadOutreachDispatchInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead outreach saved",
    url: "/lead-outreach",
  })
}

export function useDispatchBulkLeadOutreach() {
  const invalidate = useInvalidate(["lead-history", "lead-outreach-schedule", "lead", "leads", "deals"])

  return useCommonMutationApi<LeadOutreachBulkDispatchResult, LeadOutreachBulkDispatchInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Bulk outreach saved",
    url: "/lead-outreach/bulk",
  })
}

export function useLeadOutreachSchedule(params?: QueryParams) {
  return useQueryWrapper<LeadOutreachScheduleItem[]>(
    ["lead-outreach-schedule", params],
    `/lead-outreach/schedule${buildQuery(params)}`,
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
    },
    0,
    "lead-outreach-schedule",
  )
}
