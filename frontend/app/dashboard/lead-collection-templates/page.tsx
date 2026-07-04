import { ProviderTemplateList } from "@/components/stitch/pages/lead-collection-templates/provider-template-list"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess("mail")
  return <ProviderTemplateList />
}
