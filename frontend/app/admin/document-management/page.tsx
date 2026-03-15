import { DocumentManagementTemplatesPage } from "@/components/stitch/pages/document-management-templates/page"
import { documentManagementTemplatesPageMeta } from "@/static-data/pages/document-management-templates/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(documentManagementTemplatesPageMeta)

export default function Page() {
  return <DocumentManagementTemplatesPage />
}
