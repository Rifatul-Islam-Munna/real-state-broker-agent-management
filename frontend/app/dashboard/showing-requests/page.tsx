import type { Metadata } from "next"

import { TenantShowingRequestsWorkspace } from "@/components/tenant-showing-requests-workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import {
  getTenantLeads,
  getTenantProperties,
  getTenantShowingRequests,
  getTenantShowingTemplates,
} from "@/lib/tenant-dashboard-actions"

export const metadata: Metadata = { title: "Showing Requests" }

export default async function ShowingRequestsPage() {
  await requireDashboardAccess("lead")
  const [leads, properties, templates, requests] = await Promise.all([
    getTenantLeads(),
    getTenantProperties(),
    getTenantShowingTemplates(),
    getTenantShowingRequests(),
  ])

  return (
    <TenantShowingRequestsWorkspace
      leads={leads}
      properties={properties}
      requests={requests}
      templates={templates}
    />
  )
}
