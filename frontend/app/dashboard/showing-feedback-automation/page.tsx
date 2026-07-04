import type { Metadata } from "next"

import { ShowingFeedbackAutomationPage } from "@/components/stitch/pages/showing-feedback-automation/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Weekly Feedback Automation",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)

  return <ShowingFeedbackAutomationPage />
}
