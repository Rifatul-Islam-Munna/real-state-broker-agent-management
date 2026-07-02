import type { Metadata } from "next"

import { ShowingFeedbackPage } from "@/components/stitch/pages/showing-feedback/page"

export const metadata: Metadata = {
  title: "Showing Feedback",
}

export default function Page() {
  return <ShowingFeedbackPage />
}
