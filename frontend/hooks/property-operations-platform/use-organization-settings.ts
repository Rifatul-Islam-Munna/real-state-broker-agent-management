// @ts-nocheck
"use client"

import { useQueryWrapper } from "@/api-hooks/property-operations-query-wrapper"
import type { ApiSuccessResponse } from "@/lib/types/api"

export type OrganizationStripeSettings = {
  configured: boolean
  publishableKeyConfigured: boolean
  defaultCurrency: string
  last4?: string | null
  maskedSecretKey?: string | null
  maskedPublishableKey?: string | null
}

export type OrganizationBrandingSettings = {
  logoUrl: string
}

export function useOrganizationStripeSettingsQuery(enabled = true) {
  return useQueryWrapper<
    ApiSuccessResponse<OrganizationStripeSettings>,
    OrganizationStripeSettings | undefined
  >(["organization", "my", "stripe-settings"], "/organization/my/stripe-settings", {
    enabled,
    select: (response) => response?.data,
  })
}

export function useOrganizationBrandingSettingsQuery(enabled = true) {
  return useQueryWrapper<
    ApiSuccessResponse<OrganizationBrandingSettings>,
    OrganizationBrandingSettings | undefined
  >(["organization", "my", "branding-settings"], "/organization/my/branding-settings", {
    enabled,
    select: (response) => response?.data,
  })
}
