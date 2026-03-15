import { AgencySettingsPage } from "@/components/stitch/pages/agency-settings/page"
import { agencySettingsPageMeta } from "@/static-data/pages/agency-settings/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata(agencySettingsPageMeta)

export default function Page() {
  return <AgencySettingsPage />
}
