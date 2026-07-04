import type { Metadata } from "next"

import { ShowingFeedbackDashboard } from "@/components/stitch/pages/showing-feedback/feedback-dashboard"

export const metadata: Metadata = {
  title: "Showing Feedback",
}

export default function Page() {
  return <ShowingFeedbackDashboard />
}
