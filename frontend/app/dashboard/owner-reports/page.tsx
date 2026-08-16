import type { Metadata } from "next"

import { TenantOwnerReportsWorkspace } from "@/components/tenant-owner-reports-workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getTenantOwnerReports, getTenantProperties } from "@/lib/tenant-dashboard-actions"

export const metadata: Metadata = { title: "Owner Reports" }

export default async function OwnerReportsPage() {
  await requireDashboardAccess("lead")
  const [properties, reports] = await Promise.all([getTenantProperties(), getTenantOwnerReports()])
  return <TenantOwnerReportsWorkspace properties={properties} reports={reports} />
}
