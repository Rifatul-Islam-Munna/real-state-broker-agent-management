import { buildPageMetadata } from "@/lib/build-page-metadata"
import { ContactInboxPage } from "@/components/stitch/pages/contact-inbox/page"
import { contactInboxPageMeta } from "@/static-data/pages/contact-inbox/meta"

export const metadata = buildPageMetadata(contactInboxPageMeta)

export default function Page() {
  return <ContactInboxPage />
}
