import type { Metadata } from "next"

import { PropertyOwnerReportCenterPage } from "@/components/stitch/pages/property-owner-report-center/page"

export const metadata: Metadata = {
  title: "Owner Reports | Agent",
  description: "Review owner report pressure points and send updates.",
}

export default function AgentOwnerReportCenterRoute() {
  return <PropertyOwnerReportCenterPage />
}
