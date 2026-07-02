import type { Metadata } from "next"

import { RealtorShowingsPage } from "@/components/stitch/pages/realtor-showings/page"

export const metadata: Metadata = {
  title: "Realtor Showings",
}

export default function Page() {
  return <RealtorShowingsPage />
}
