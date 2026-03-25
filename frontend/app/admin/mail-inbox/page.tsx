import { buildPageMetadata } from "@/lib/build-page-metadata"
import { MailInboxPage } from "@/components/stitch/pages/mail-inbox/page"
import { mailInboxPageMeta } from "@/data/page-metadata/admin"

export const metadata = buildPageMetadata(mailInboxPageMeta)

export default function Page() {
  return <MailInboxPage />
}
