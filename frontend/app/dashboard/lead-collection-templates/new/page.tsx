import { ConfigurableLeadCollectionTemplateEditor } from "@/components/stitch/pages/lead-collection-templates/configurable-editor"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mailInboxId?: string; preset?: string }>
}) {
  await requireDashboardAccess("mail")
  const params = await searchParams
  const initialMailInboxId = Number(params.mailInboxId || 0) || undefined
  return (
    <ConfigurableLeadCollectionTemplateEditor
      initialMailInboxId={initialMailInboxId}
      initialPreset={params.preset}
    />
  )
}
