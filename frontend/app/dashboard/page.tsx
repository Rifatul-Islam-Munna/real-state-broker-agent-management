import { DashboardApiPage } from "@/components/stitch/pages/admin-api/dashboard-api-page"
import { adminDashboardPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...adminDashboardPageMeta,
  routePath: "/dashboard",
})

export default async function Page() {
  const user = await requireDashboardAccess("dashboard")

  return (
    <DashboardApiPage
      currentUserName={user.fullName}
      portal={user.role === "Agent" ? "agent" : "admin"}
    />
  )
}
