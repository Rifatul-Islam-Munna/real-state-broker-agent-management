import { PdfDownloadHistory } from "@/components/stitch/pages/pdf-management/archive"
import { PdfGenerationWorkspacePage } from "@/components/stitch/pages/pdf-management/generate"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

type PageProps = { searchParams: Promise<{ templateId?: string }> }

export default async function Page({ searchParams }: PageProps) {
  await requireDashboardAccess(undefined, true)
  const parsed = Number((await searchParams).templateId)
  const templateId = Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
  return (
    <>
      <PdfGenerationWorkspacePage initialTemplateId={templateId} />
      <div className="bg-muted/20 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1680px]"><PdfDownloadHistory /></div>
      </div>
    </>
  )
}
