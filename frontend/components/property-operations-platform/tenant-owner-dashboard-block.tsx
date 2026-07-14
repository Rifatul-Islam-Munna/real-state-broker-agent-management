// @ts-nocheck
"use client"

import { TenantOwnerDashboard } from "@/components/property-operations-platform/tenant-owner-dashboard"
import { TenantOwnerShell } from "@/components/property-operations-platform/tenant-owner-shell"

export function TenantOwnerDashboardBlock() {
  return (
    <TenantOwnerShell showInsights>
      <TenantOwnerDashboard />
    </TenantOwnerShell>
  )
}
