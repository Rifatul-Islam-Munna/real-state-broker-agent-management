import { ReportsAnalyticsDashboardPage } from "@/components/stitch/pages/reports-analytics-dashboard/page"
import { reportsAnalyticsDashboardPageMeta } from "@/static-data/pages/reports-analytics-dashboard/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(reportsAnalyticsDashboardPageMeta)

export default function Page() {
  return <ReportsAnalyticsDashboardPage />
}
