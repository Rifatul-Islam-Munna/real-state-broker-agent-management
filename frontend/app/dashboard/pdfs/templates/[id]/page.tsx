import { notFound } from "next/navigation"

import { PdfTemplateEditorPage } from "@/components/stitch/pages/pdf-management/workspace"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

type PageProps = { params: Promise<{ id: string }> }

export default async function Page({ params }: PageProps) {
  await requireDashboardAccess(undefined, true)
  const templateId = Number((await params).id)
  if (!Number.isInteger(templateId) || templateId <= 0) notFound()
  return <PdfTemplateEditorPage templateId={templateId} />
}
