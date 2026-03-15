import { PropertyManagementPage } from "@/components/stitch/pages/property-management/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Property Management | EstateBlue",
  description: "Agent property workspace for open listings, filters, and new property actions.",
  routePath: "/agent/properties",
})

export default function Page() {
  return <PropertyManagementPage />
}
