"use client"

import { useQueryClient } from "@tanstack/react-query"

import type {
  RealtorShowingImportInput,
  RealtorShowingImportResult,
  RealtorShowingAutomationInput,
  RealtorShowingManualInput,
  RealtorShowingItem,
  PaginatedResult,
  ShowingFeedbackItem,
  ShowingFeedbackPreviewInput,
  ShowingFeedbackPropertySummary,
  ShowingFeedbackRenderedReport,
  ShowingFeedbackSendInput,
} from "@/@types/real-estate-api"
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"
import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"

export type ShowingFeedbackManualInput = {
  propertyId: number
  realtorName: string
  realtorEmail: string
  realtorPhone: string
  channel: "Email" | "Sms"
  sentiment: "positive" | "neutral" | "negative"
  feedbackText: string
  showingAt: string
  firstMessageAt: string
  receivedAt?: string | null
}

export type ShowingFeedbackImportInput = {
  rows: Array<Record<string, string>>
  mapping: {
    property: string
    realtorName: string
    realtorContact: string
    realtorEmail: string
    realtorPhone: string
    channel: string
    feedbackText: string
    sentiment: string
    showingAt: string
    firstMessageAt: string
    receivedAt: string
  }
}

export function useRealtorShowings(search = "") {
  const query = search.trim()
    ? `?search=${encodeURIComponent(search.trim())}`
    : ""
  return useQueryWrapper<RealtorShowingItem[]>(
    ["realtor-showings", search],
    `/realtor-showings${query}`,
    { placeholderData: [] },
    0,
    "realtor-showings"
  )
}

export function useImportRealtorShowings() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<
    RealtorShowingImportResult,
    RealtorShowingImportInput
  >({
    method: "POST",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Realtor showings imported",
    url: "/realtor-showings/import",
  })
}

export function useCreateRealtorShowing() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<
    RealtorShowingImportResult,
    RealtorShowingManualInput
  >({
    method: "POST",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Realtor showing created",
    url: "/realtor-showings",
  })
}

export function useUpdateRealtorShowingProperty() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<
    RealtorShowingItem,
    { id: number; propertyId: number | null }
  >({
    method: "PATCH",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Property match updated",
    url: "/realtor-showings/property",
  })
}

export function useUpdateRealtorShowingAutomation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<
    RealtorShowingItem,
    RealtorShowingAutomationInput
  >({
    method: "PATCH",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Showing automation updated",
    url: "/realtor-showings/automation",
  })
}

export function useShowingFeedbackProperties() {
  return useQueryWrapper<ShowingFeedbackPropertySummary[]>(
    ["showing-feedback-properties"],
    "/showing-feedback/properties",
    { placeholderData: [] },
    0,
    "showing-feedback-properties"
  )
}

export function useShowingFeedback(params: {
  propertyId?: number | null
  page?: number
  pageSize?: number
  fromDate?: string
  toDate?: string
  sentiment?: "positive" | "neutral" | "negative"
}) {
  const search = new URLSearchParams()
  if (params.propertyId) search.set("propertyId", String(params.propertyId))
  search.set("page", String(params.page ?? 1))
  search.set("pageSize", String(params.pageSize ?? 10))
  if (params.fromDate) search.set("fromDate", params.fromDate)
  if (params.toDate) search.set("toDate", params.toDate)
  if (params.sentiment) search.set("sentiment", params.sentiment)

  return useQueryWrapper<PaginatedResult<ShowingFeedbackItem>>(
    ["showing-feedback", params],
    `/showing-feedback?${search.toString()}`,
    { enabled: Boolean(params.propertyId) },
    0,
    "showing-feedback"
  )
}

function useInvalidateFeedback() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["showing-feedback"] }),
      queryClient.invalidateQueries({
        queryKey: ["showing-feedback-properties"],
      }),
      queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    ])
}

export function useCreateShowingFeedback() {
  const invalidate = useInvalidateFeedback()
  return useCommonMutationApi<ShowingFeedbackItem, ShowingFeedbackManualInput>({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Showing feedback saved",
    url: "/showing-feedback",
  })
}

export function useImportShowingFeedback() {
  const invalidate = useInvalidateFeedback()
  return useCommonMutationApi<
    RealtorShowingImportResult,
    ShowingFeedbackImportInput
  >({
    method: "POST",
    onSuccess: () => void invalidate(),
    successMessage: "Showing feedback imported",
    url: "/showing-feedback/import",
  })
}

export function usePreviewShowingFeedbackReport() {
  return useCommonMutationApi<
    ShowingFeedbackRenderedReport,
    ShowingFeedbackPreviewInput
  >({
    method: "POST",
    successMessage: "Feedback preview ready",
    url: "/showing-feedback/preview",
  })
}

export function useSendShowingFeedbackReport() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<
    ShowingFeedbackRenderedReport,
    ShowingFeedbackSendInput
  >({
    method: "POST",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["showing-feedback"] }),
    successMessage: "Feedback sent to owner",
    url: "/showing-feedback/send",
  })
}
