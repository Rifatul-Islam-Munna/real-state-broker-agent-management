import type { Metadata } from "next"

import { HomePageManagementPage } from "@/components/stitch/pages/homepage-management/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Homepage Content | EstateBlue",
  description: "Workspace for editing homepage text and images while keeping the current layout.",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <HomePageManagementPage />
}
