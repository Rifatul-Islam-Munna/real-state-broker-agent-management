import type { Metadata } from "next"

import { ShowingFeedbackDashboard } from "@/components/stitch/pages/showing-feedback/feedback-dashboard"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Showing Feedback",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)

  return <ShowingFeedbackDashboard />
}
