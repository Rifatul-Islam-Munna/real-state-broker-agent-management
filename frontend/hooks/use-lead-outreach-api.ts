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
  TenantOutreachMonitor,
} from "@/@types/real-estate-api"

type QueryParams = Record<string, string | number | boolean | undefined | null>
type LeadOutreachBulkComposerInput = Omit<
  LeadOutreachBulkDispatchInput,
  "audienceType"
> & {
  audienceType: LeadOutreachBulkDispatchInput["audienceType"] | "SingleLead"
}

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
    Promise.all(
      keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] }))
    )
}

export function useLeadOutreachTemplates() {
  return useQueryWrapper<AgencyCommunicationTemplateItem[]>(
    ["lead-outreach-templates"],
    "/lead-outreach/templates",
    {
      ...defaultQueryOptions,
      gcTime: 0,
      placeholderData: undefined,
      refetchOnMount: "always",
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      staleTime: 0,
    },
    0,
    "lead-outreach-templates"
  )
}

export function useDispatchLeadOutreach() {
  const invalidate = useInvalidate([
    "lead-history",
    "lead-outreach-schedule",
    "lead-outreach-monitor",
    "lead",
    "leads",
  ])

  return useCommonMutationApi<LeadHistoryEntry, LeadOutreachDispatchInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead outreach saved",
    url: "/lead-outreach",
  })
}

export function useDispatchBulkLeadOutreach() {
  const invalidate = useInvalidate([
    "lead-history",
    "lead-outreach-schedule",
    "lead-outreach-monitor",
    "lead",
    "leads",
    "deals",
  ])

  return useCommonMutationApi<
    LeadOutreachBulkDispatchResult,
    LeadOutreachBulkComposerInput
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Bulk outreach saved",
    url: "/lead-outreach/bulk",
  })
}

type LeadOutreachScheduleResponse =
  | LeadOutreachScheduleItem[]
  | { data?: LeadOutreachScheduleItem[]; items?: LeadOutreachScheduleItem[] }

function normalizeScheduleResponse(
  response: LeadOutreachScheduleResponse | null | undefined
) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.items)) return response.items
  if (Array.isArray(response?.data)) return response.data
  return []
}

export function useLeadOutreachSchedule(params?: QueryParams) {
  return useQueryWrapper<
    LeadOutreachScheduleResponse,
    LeadOutreachScheduleItem[]
  >(
    ["lead-outreach-schedule", params],
    `/lead-outreach/schedule${buildQuery(params)}`,
    {
      ...defaultQueryOptions,
      placeholderData: undefined,
      select: normalizeScheduleResponse,
    },
    0,
    "lead-outreach-schedule"
  )
}

export function useUpdateLeadOutreachScheduleStatus() {
  const invalidate = useInvalidate([
    "lead-outreach-schedule",
    "lead-outreach-monitor",
    "lead-history",
    "lead",
    "leads",
  ])

  return useCommonMutationApi<
    LeadOutreachScheduleItem,
    { id: number; status: "active" | "paused" | "cancelled" }
  >({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Lead outreach updated",
    url: "/lead-outreach/schedule-status",
  })
}

export function useMarkLeadRepliesRead() {
  const invalidate = useInvalidate([
    "lead-outreach-schedule",
    "lead-outreach-monitor",
    "lead-history",
    "lead",
    "leads",
  ])

  return useCommonMutationApi<
    { ids: number[]; isRead: boolean },
    { ids: number[]; isRead?: boolean }
  >({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Replies updated",
    url: "/lead-outreach/replies/read",
  })
}

export function useTenantOutreachMonitor(enabled = true) {
  return useQueryWrapper<TenantOutreachMonitor>(
    ["lead-outreach-monitor"],
    "/lead-outreach/monitor",
    {
      ...defaultQueryOptions,
      enabled,
      placeholderData: undefined,
      refetchInterval: enabled ? 10_000 : false,
    },
    0,
    "lead-outreach-monitor"
  )
}

export function useRetryTenantOutreachJob() {
  const invalidate = useInvalidate([
    "lead-outreach-schedule",
    "lead-outreach-monitor",
  ])

  return useCommonMutationApi<LeadOutreachScheduleItem, { id: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Outreach job queued for retry",
    url: "/lead-outreach/jobs/retry",
  })
}
