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

export function useRealtorShowings(search = "") {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
  return useQueryWrapper<RealtorShowingItem[]>(
    ["realtor-showings", search],
    `/realtor-showings${query}`,
    { placeholderData: [] },
    0,
    "realtor-showings",
  )
}

export function useImportRealtorShowings() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<RealtorShowingImportResult, RealtorShowingImportInput>({
    method: "POST",
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Realtor showings imported",
    url: "/realtor-showings/import",
  })
}

export function useCreateRealtorShowing() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<RealtorShowingImportResult, RealtorShowingManualInput>({
    method: "POST",
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Realtor showing created",
    url: "/realtor-showings",
  })
}

export function useUpdateRealtorShowingProperty() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<RealtorShowingItem, { id: number; propertyId: number | null }>({
    method: "PATCH",
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
    successMessage: "Property match updated",
    url: "/realtor-showings/property",
  })
}

export function useUpdateRealtorShowingAutomation() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<RealtorShowingItem, RealtorShowingAutomationInput>({
    method: "PATCH",
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["realtor-showings"] }),
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
    "showing-feedback-properties",
  )
}

export function useShowingFeedback(params: {
  propertyId?: number | null
  page?: number
  pageSize?: number
  fromDate?: string
  toDate?: string
}) {
  const search = new URLSearchParams()
  if (params.propertyId) search.set("propertyId", String(params.propertyId))
  search.set("page", String(params.page ?? 1))
  search.set("pageSize", String(params.pageSize ?? 10))
  if (params.fromDate) search.set("fromDate", params.fromDate)
  if (params.toDate) search.set("toDate", params.toDate)

  return useQueryWrapper<PaginatedResult<ShowingFeedbackItem>>(
    ["showing-feedback", params],
    `/showing-feedback?${search.toString()}`,
    { enabled: Boolean(params.propertyId) },
    0,
    "showing-feedback",
  )
}

export function usePreviewShowingFeedbackReport() {
  return useCommonMutationApi<ShowingFeedbackRenderedReport, ShowingFeedbackPreviewInput>({
    method: "POST",
    successMessage: "Feedback preview ready",
    url: "/showing-feedback/preview",
  })
}

export function useSendShowingFeedbackReport() {
  const queryClient = useQueryClient()
  return useCommonMutationApi<ShowingFeedbackRenderedReport, ShowingFeedbackSendInput>({
    method: "POST",
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["showing-feedback"] }),
    successMessage: "Feedback sent to owner",
    url: "/showing-feedback/send",
  })
}
