import { notFound } from "next/navigation"

import { ConfigurableLeadCollectionTemplateEditor } from "@/components/stitch/pages/lead-collection-templates/configurable-editor"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireDashboardAccess("mail")
  const { id } = await params
  const templateId = Number(id)
  if (!Number.isInteger(templateId) || templateId <= 0) notFound()
  return <ConfigurableLeadCollectionTemplateEditor templateId={templateId} />
}
