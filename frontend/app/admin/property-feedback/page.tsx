import type { Metadata } from "next"

import { PropertyFeedbackWorkspacePage } from "@/components/stitch/pages/property-feedback-workspace/page"

export const metadata: Metadata = {
  title: "Property Feedback | Admin",
  description: "Showing feedback workflow, imports, reminders, and reply capture.",
}

export default function AdminPropertyFeedbackRoute() {
  return <PropertyFeedbackWorkspacePage />
}
