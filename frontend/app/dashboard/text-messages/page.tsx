import { ProfessionalTextMessagesPage } from "@/components/stitch/pages/text-messages/professional-text-workspace"
import { textMessagesPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...textMessagesPageMeta,
  routePath: "/dashboard/text-messages",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <ProfessionalTextMessagesPage />
}
