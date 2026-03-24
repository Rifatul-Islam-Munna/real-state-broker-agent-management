"use client"

import { keepPreviousData, useQueryClient } from "@tanstack/react-query"

import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import type {
  AgentUserOption,
  ContactRequestItem,
  CreateAgentUserInput,
  DealItem,
  LeadItem,
  MailInboxItem,
  PaginatedResult,
  PropertyItem,
} from "@/types/real-estate-api"

export type {
  AgentSummary,
  AgentUserOption,
  ContactRequestItem,
  ContactRequestStatus,
  CreateAgentUserInput,
  DealItem,
  DealStage,
  DealType,
  LeadItem,
  LeadPriority,
  LeadStage,
  MailInboxItem,
  MailInboxKind,
  MailInboxStatus,
  NeighborhoodInsight,
  PaginatedResult,
  PropertyItem,
} from "@/types/real-estate-api"

type QueryParams = Record<string, string | number | undefined | null>

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

export function useProperties(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<PropertyItem>>(
    ["properties", params],
    `/properties${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "properties",
  )
}

export function useAgentUsers() {
  return useQueryWrapper<AgentUserOption[]>(
    ["agent-users"],
    "/users/agents",
    defaultQueryOptions,
    0,
    "agent-users",
  )
}

export function useCreateAgentUser() {
  const invalidate = useInvalidate(["agent-users"])

  return useCommonMutationApi<AgentUserOption, CreateAgentUserInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Agent created",
    url: "/users/agents",
  })
}

export function useCreateProperty() {
  const invalidate = useInvalidate(["properties"])

  return useCommonMutationApi<
    PropertyItem,
    Omit<PropertyItem, "id" | "slug" | "agent" | "createdAt" | "updatedAt">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Property saved",
    url: "/properties",
  })
}

export function useUpdateProperty() {
  const invalidate = useInvalidate(["properties"])

  return useCommonMutationApi<PropertyItem, PropertyItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Property updated",
    url: "/properties",
  })
}

export function useDeleteProperty() {
  const invalidate = useInvalidate(["properties"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Property deleted",
    url: "/properties",
  })
}

export function useLeads(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<LeadItem>>(
    ["leads", params],
    `/leads${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "leads",
  )
}

export function useCreateLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<
    LeadItem,
    Omit<LeadItem, "id" | "createdAt" | "updatedAt" | "lastActivityAt" | "linkedDealId" | "linkedDealTitle">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead saved",
    url: "/leads",
  })
}

export function useUpdateLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<LeadItem, LeadItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Lead updated",
    url: "/leads",
  })
}

export function useDeleteLead() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Lead deleted",
    url: "/leads",
  })
}

export function useConvertLeadToDeal() {
  const invalidate = useInvalidate(["leads", "deals", "dashboard"])

  return useCommonMutationApi<DealItem, { leadId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Lead converted into deal",
    url: "/deals/convert-from-lead",
  })
}

export function useDeals(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<DealItem>>(
    ["deals", params],
    `/deals${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "deals",
  )
}

export function useCreateDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<
    DealItem,
    Omit<DealItem, "id" | "createdAt" | "updatedAt" | "sourceLeadName">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Deal saved",
    url: "/deals",
  })
}

export function useUpdateDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<DealItem, DealItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Deal updated",
    url: "/deals",
  })
}

export function useDeleteDeal() {
  const invalidate = useInvalidate(["deals", "leads", "dashboard"])

  return useCommonMutationApi<unknown, { id: string }>({
    method: "DELETE",
    onSuccess: () => void invalidate(),
    successMessage: "Deal deleted",
    url: "/deals",
  })
}

export function useContactRequests(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<ContactRequestItem>>(
    ["contact-requests", params],
    `/contact-requests${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "contact-requests",
  )
}

export function useCreateContactRequest() {
  const invalidate = useInvalidate(["contact-requests", "dashboard"])

  return useCommonMutationApi<
    ContactRequestItem,
    Omit<ContactRequestItem, "id" | "status" | "leadId" | "createdAt" | "updatedAt">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Inquiry sent",
    url: "/contact-requests",
  })
}

export function useUpdateContactRequest() {
  const invalidate = useInvalidate(["contact-requests", "dashboard"])

  return useCommonMutationApi<ContactRequestItem, ContactRequestItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Contact updated",
    url: "/contact-requests",
  })
}

export function useConvertContactRequestToLead() {
  const invalidate = useInvalidate(["contact-requests", "leads", "dashboard"])

  return useCommonMutationApi<LeadItem, { contactRequestId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Contact converted to lead",
    url: "/contact-requests/convert-to-lead",
  })
}

export function useMailInbox(params?: QueryParams) {
  return useQueryWrapper<PaginatedResult<MailInboxItem>>(
    ["mail-inbox", params],
    `/mail-inbox${buildQuery(params)}`,
    defaultQueryOptions,
    0,
    "mail-inbox",
  )
}

export function useCreateMailInboxItem() {
  const invalidate = useInvalidate(["mail-inbox", "dashboard"])

  return useCommonMutationApi<
    MailInboxItem,
    Omit<MailInboxItem, "id" | "status" | "leadId" | "createdAt" | "updatedAt">
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Inbox item saved",
    url: "/mail-inbox",
  })
}

export function useUpdateMailInboxItem() {
  const invalidate = useInvalidate(["mail-inbox", "dashboard"])

  return useCommonMutationApi<MailInboxItem, MailInboxItem>({
    method: "PATCH",
    onSuccess: () => void invalidate(),
    successMessage: "Mail updated",
    url: "/mail-inbox",
  })
}

export function useConvertMailInboxToLead() {
  const invalidate = useInvalidate(["mail-inbox", "leads", "dashboard"])

  return useCommonMutationApi<LeadItem, { mailInboxId: number }>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Mail converted to lead",
    url: "/mail-inbox/convert-to-lead",
  })
}
