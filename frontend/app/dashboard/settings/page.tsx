import { AgencySettingsPage } from "@/components/stitch/pages/agency-settings/page"
import { agencySettingsPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...agencySettingsPageMeta,
  routePath: "/dashboard/settings",
})

export default async function Page() {
  await requireDashboardAccess("settings")
  return <AgencySettingsPage />
}
