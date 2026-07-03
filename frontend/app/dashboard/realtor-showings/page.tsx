import type { Metadata } from "next"

import { RealtorShowingsPageV2 } from "@/components/stitch/pages/realtor-showings/page-v2"

export const metadata: Metadata = {
  title: "Realtor Showings",
}

export default function Page() {
  return <RealtorShowingsPageV2 />
}
