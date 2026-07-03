"use client"

import { useCommonMutationApi } from "@/api-hooks/use-api-mutation"

export type IntegrationHealthResult = {
  checkedAt: string
  overall: "healthy" | "degraded" | "not_configured"
  services: Record<string, { configured: boolean; ok: boolean; message: string }>
}

export function useIntegrationHealth() {
  return useCommonMutationApi<IntegrationHealthResult, Record<string, never>>({
    method: "POST",
    url: "/settings/integrations/health",
  })
}
