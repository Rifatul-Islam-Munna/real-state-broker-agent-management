import { ContactInboxPage } from "@/components/stitch/pages/contact-inbox/page"
import { contactInboxPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...contactInboxPageMeta,
  routePath: "/dashboard/contact-inbox",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <ContactInboxPage />
}
