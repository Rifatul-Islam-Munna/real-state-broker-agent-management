import { PropertyManagementPage } from "@/components/stitch/pages/property-management/page"
import { propertyManagementPageMeta } from "@/static-data/pages/property-management/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(propertyManagementPageMeta)

export default function Page() {
  return <PropertyManagementPage />
}
