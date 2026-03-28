import { PropertyChatInboxPage } from "@/components/stitch/pages/property-chat-inbox/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"
import { contactInboxPageMeta } from "@/data/page-metadata/admin"

export const metadata = buildPageMetadata({
  ...contactInboxPageMeta,
  routePath: "/admin/property-chat-inbox",
  title: "Property Chat Inbox",
  description: "Admin inbox for property chats, pre-question summaries, and auto-qualified leads.",
})

export default function Page() {
  return <PropertyChatInboxPage />
}
