import { AgencySettingsPage } from "@/components/stitch/pages/agency-settings/page"
import { IntegrationHealthPanel } from "@/components/stitch/pages/agency-settings/sections/integration-health-panel"
import { agencySettingsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...agencySettingsPageMeta,
  routePath: "/dashboard/settings",
})

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return (
    <>
      <AgencySettingsPage />
      <div className="bg-muted/20 px-4 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1500px] space-y-6">
          <IntegrationHealthPanel />
        </div>
      </div>
    </>
  )
}
