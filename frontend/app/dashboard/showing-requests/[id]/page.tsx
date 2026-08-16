import type { Metadata } from "next"

import { TenantShowingRequestDetail } from "@/components/tenant-showing-request-detail"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { getTenantProperties, getTenantShowingRequest } from "@/lib/tenant-dashboard-actions"

export const metadata: Metadata = { title: "Showing Request Details" }

type ShowingRequestDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function ShowingRequestDetailPage({ params }: ShowingRequestDetailPageProps) {
  await requireDashboardAccess("lead")
  const { id } = await params
  const [request, properties] = await Promise.all([
    getTenantShowingRequest(Number(id)),
    getTenantProperties(),
  ])
  return <TenantShowingRequestDetail properties={properties} request={request} />
}
