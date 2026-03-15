import { buildPageMetadata } from "@/lib/build-page-metadata"
import { MailInboxPage } from "@/components/stitch/pages/mail-inbox/page"
import { mailInboxPageMeta } from "@/static-data/pages/mail-inbox/meta"

export const metadata = buildPageMetadata(mailInboxPageMeta)

export default function Page() {
  return <MailInboxPage />
}
