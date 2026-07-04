import { ConfigurableTemplateRegistryPage } from "@/components/stitch/pages/lead-collection-templates/configurable-template-registry"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export default async function Page() {
  await requireDashboardAccess("mail")
  return <ConfigurableTemplateRegistryPage />
}
