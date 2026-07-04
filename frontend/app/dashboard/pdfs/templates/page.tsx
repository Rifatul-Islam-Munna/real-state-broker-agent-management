import { PdfTemplateLibraryPage } from "@/components/stitch/pages/pdf-management/pages"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <PdfTemplateLibraryPage />
}
