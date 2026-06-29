import { ManagedMailInboxPage } from "@/components/stitch/pages/lead-history/managed-mail-inbox-page"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  title: "Mail Monitor | EstateBlue",
  description: "Mail inbox with mailbox connection status and sync health.",
  routePath: "/dashboard/mail-monitor",
})

export default async function Page() {
  await requireDashboardAccess("mail")
  return <ManagedMailInboxPage />
}
