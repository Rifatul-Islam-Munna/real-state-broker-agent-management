import { DocumentManagementTemplatesPage } from "@/components/stitch/pages/document-management-templates/page"
import { documentManagementTemplatesPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...documentManagementTemplatesPageMeta,
  routePath: "/dashboard/documents",
})

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <DocumentManagementTemplatesPage />
}
