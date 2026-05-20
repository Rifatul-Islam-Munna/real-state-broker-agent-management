import type { Metadata } from "next"

import { PropertyOwnerReportCenterPage } from "@/components/stitch/pages/property-owner-report-center/page"

export const metadata: Metadata = {
  title: "Owner Reports | Admin",
  description: "Weekly and monthly owner updates built from showing feedback.",
}

export default function AdminOwnerReportCenterRoute() {
  return <PropertyOwnerReportCenterPage />
}
