import { PdfTemplateEditorPage } from "@/components/stitch/pages/pdf-management/workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <PdfTemplateEditorPage />
}
