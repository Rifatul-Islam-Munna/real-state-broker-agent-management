import { LeadCollectionTemplatesPage } from "@/components/stitch/pages/lead-collection-templates/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess("mail")
  return <LeadCollectionTemplatesPage />
}
