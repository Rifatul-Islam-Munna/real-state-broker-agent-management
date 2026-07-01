import { redirect } from "next/navigation"

import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess("mail")
  redirect("/dashboard/mail")
}
