import { MailInboxDetailPage } from "@/components/stitch/pages/lead-history/managed-mail-inbox-page"
import { mailInboxPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...mailInboxPageMeta,
  routePath: "/dashboard/mail",
})

export default async function Page({ params }: { params: Promise<{ mailId: string }> }) {
  await requireDashboardAccess("mail")
  const { mailId } = await params
  return <MailInboxDetailPage mailId={Number(mailId)} />
}
