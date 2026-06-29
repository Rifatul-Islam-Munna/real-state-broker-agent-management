import { PropertyChatInboxPage } from "@/components/stitch/pages/property-chat-inbox/page"
import { contactInboxPageMeta } from "@/data/page-metadata/admin"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = buildPageMetadata({
  ...contactInboxPageMeta,
  routePath: "/dashboard/property-chat-inbox",
  title: "Property Chat Inbox",
  description: "Inbox for property chats, pre-question summaries, and auto-qualified leads.",
})

export default async function Page() {
  await requireDashboardAccess("lead")
  return <PropertyChatInboxPage />
}
