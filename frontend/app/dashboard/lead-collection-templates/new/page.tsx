import { LeadCollectionTemplateEditor } from "@/components/stitch/pages/lead-collection-templates/editor"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mailInboxId?: string }>
}) {
  await requireDashboardAccess("mail")
  const params = await searchParams
  const initialMailInboxId = Number(params.mailInboxId || 0) || undefined
  return <LeadCollectionTemplateEditor initialMailInboxId={initialMailInboxId} />
}
