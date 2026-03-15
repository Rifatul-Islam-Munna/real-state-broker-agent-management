import { AdminDashboardPage } from "@/components/stitch/pages/admin-dashboard/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Dashboard | EstateBlue",
  description: "Focused agent dashboard for listings, leads, deals, and inbox activity.",
  routePath: "/agent/dashboard",
})

export default function Page() {
  return <AdminDashboardPage />
}
