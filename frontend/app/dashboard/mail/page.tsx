import { MailInboxPage } from "@/components/stitch/pages/mail-inbox/page"
import { mailInboxPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...mailInboxPageMeta,
  routePath: "/dashboard/mail",
})

export default async function Page() {
  await requireDashboardAccess("mail")
  return <MailInboxPage />
}
