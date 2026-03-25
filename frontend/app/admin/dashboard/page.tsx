import { DashboardApiPage } from "@/components/stitch/pages/admin-api/dashboard-api-page"
import { adminDashboardPageMeta } from "@/static-data/pages/admin-dashboard/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireSession } from "@/lib/auth-actions"

export const metadata = buildPageMetadata(adminDashboardPageMeta)

export default async function Page() {
  const user = await requireSession(["Admin"])

  return <DashboardApiPage currentUserName={user.fullName} portal="admin" />
}
