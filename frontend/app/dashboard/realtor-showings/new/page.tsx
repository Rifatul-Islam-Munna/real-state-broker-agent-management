import type { Metadata } from "next"

import { CreateRealtorShowingPage } from "@/components/stitch/pages/realtor-showings/create-showing-page"

export const metadata: Metadata = {
  title: "Add Realtor Showing",
}

export default function Page() {
  return <CreateRealtorShowingPage />
}
