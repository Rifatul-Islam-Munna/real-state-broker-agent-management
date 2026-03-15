import { AdminDashboardPage } from "@/components/stitch/pages/admin-dashboard/page"
import { adminDashboardPageMeta } from "@/static-data/pages/admin-dashboard/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(adminDashboardPageMeta)

export default function Page() {
  return <AdminDashboardPage />
}
