import { DocumentManagementTemplatesPage } from "@/components/stitch/pages/document-management-templates/page"
import { documentManagementTemplatesPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(documentManagementTemplatesPageMeta)

export default function Page() {
  return <DocumentManagementTemplatesPage />
}
