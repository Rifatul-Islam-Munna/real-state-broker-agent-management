import { ReplyInboxPage } from "@/components/stitch/pages/lead-history/reply-inbox-page"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  title: "Reply Inbox | EstateBlue",
  description: "One inbox for incoming lead email and SMS replies.",
  routePath: "/dashboard/replies",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <ReplyInboxPage />
}
