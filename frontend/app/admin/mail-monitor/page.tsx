import { buildPageMetadata } from "@/lib/build-page-metadata"
import { ManagedMailInboxPage } from "@/components/stitch/pages/lead-history/managed-mail-inbox-page"

export const metadata = buildPageMetadata({
  title: "Mail Monitor | EstateBlue",
  description: "Mail inbox with mailbox connection status and sync health.",
  routePath: "/admin/mail-monitor",
})

export default function Page() {
  return <ManagedMailInboxPage />
}
