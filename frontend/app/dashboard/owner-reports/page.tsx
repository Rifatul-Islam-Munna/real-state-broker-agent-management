import type { Metadata } from "next"

import { TenantOwnerReportsWorkspace } from "@/components/tenant-owner-reports-workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getTenantOwnerReports } from "@/lib/tenant-dashboard-actions"

export const metadata: Metadata = { title: "Owner Reports" }

export default async function OwnerReportsPage() {
  await requireDashboardAccess("lead")
  const reports = await getTenantOwnerReports()
  return <TenantOwnerReportsWorkspace reports={reports} />
}
