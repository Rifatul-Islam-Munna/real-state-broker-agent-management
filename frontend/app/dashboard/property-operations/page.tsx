import type { Metadata } from "next"

import { PropertyOperationsPage } from "@/components/stitch/pages/property-operations/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Property Operations",
  description: "Manage imported properties and operational workflows.",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <PropertyOperationsPage />
}
