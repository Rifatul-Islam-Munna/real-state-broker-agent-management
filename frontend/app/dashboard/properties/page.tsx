import { PropertyManagementPage } from "@/components/stitch/pages/property-management/page"
import { propertyManagementPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...propertyManagementPageMeta,
  routePath: "/dashboard/properties",
})

export default async function Page() {
  await requireDashboardAccess("properties")
  return <PropertyManagementPage />
}
