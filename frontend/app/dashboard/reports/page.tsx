import { ReportsAnalyticsDashboardPage } from "@/components/stitch/pages/reports-analytics-dashboard/page"
import { reportsAnalyticsDashboardPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...reportsAnalyticsDashboardPageMeta,
  routePath: "/dashboard/reports",
})

export default async function Page() {
  await requireDashboardAccess("dashboard")
  return <ReportsAnalyticsDashboardPage />
}
