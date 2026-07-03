"use client"

import { useQueryClient } from "@tanstack/react-query"

import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"
import { useQueryWrapper } from "@/api-hooks/react-query-wrapper"

export type AgencySchedulingSettings = {
  timeZone: string
  morningOutreachHour: number
  updatedAt?: string | null
}

export function useSchedulingSettings() {
  return useQueryWrapper<AgencySchedulingSettings>(
    ["scheduling-settings"],
    "/settings/scheduling",
    undefined,
    0,
    "scheduling-settings",
  )
}

export function useUpdateSchedulingSettings() {
  const queryClient = useQueryClient()

  return useCommonMutationApi<
    AgencySchedulingSettings,
    Pick<AgencySchedulingSettings, "timeZone" | "morningOutreachHour">
  >({
    method: "PATCH",
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["scheduling-settings"] }),
    successMessage: "Scheduling preferences saved",
    url: "/settings/scheduling",
  })
}
