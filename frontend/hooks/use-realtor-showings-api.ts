"use client"

import { useQueryClient } from "@tanstack/react-query"

import type {
  RealtorShowingImportInput,
  RealtorShowingImportResult,
  RealtorShowingAutomationInput,
  RealtorShowingManualInput,
  RealtorShowingItem,
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
