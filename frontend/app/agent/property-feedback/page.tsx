import type { Metadata } from "next"

import { PropertyFeedbackWorkspacePage } from "@/components/stitch/pages/property-feedback-workspace/page"

export const metadata: Metadata = {
  title: "Property Feedback | Agent",
  description: "Track showing feedback, imports, and reminder queue.",
}

export default function AgentPropertyFeedbackRoute() {
  return <PropertyFeedbackWorkspacePage />
}
