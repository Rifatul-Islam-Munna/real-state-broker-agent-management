import { ReportsAnalyticsDashboardPage } from "@/components/stitch/pages/reports-analytics-dashboard/page"
import { reportsAnalyticsDashboardPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(reportsAnalyticsDashboardPageMeta)

export default function Page() {
  return <ReportsAnalyticsDashboardPage />
}
