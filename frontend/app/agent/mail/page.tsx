import { MailInboxPage } from "@/components/stitch/pages/mail-inbox/page"
import { buildPageMetadata } from "@/lib/build-page-metadata"

export const metadata = buildPageMetadata({
  title: "Agent Mail Inbox | EstateBlue",
  description: "Agent inbox for incoming mail, newsletter signups, and lead conversion actions.",
  routePath: "/agent/mail",
})

export default function Page() {
  return <MailInboxPage />
}
