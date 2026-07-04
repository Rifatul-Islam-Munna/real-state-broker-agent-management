import { redirect } from "next/navigation"

import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  redirect("/dashboard/pdfs/templates")
}
