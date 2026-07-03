import type { Metadata } from "next"

import { ShowingFeedbackPageV2 } from "@/components/stitch/pages/showing-feedback/page-v2"

export const metadata: Metadata = {
  title: "Showing Feedback",
}

export default function Page() {
  return <ShowingFeedbackPageV2 />
}
