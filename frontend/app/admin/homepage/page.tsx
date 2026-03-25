import type { Metadata } from "next"

import { HomePageManagementPage } from "@/components/stitch/pages/homepage-management/page"
import { requireSession } from "@/lib/auth-actions"

export const metadata: Metadata = {
  title: "Homepage Content | EstateBlue Admin",
  description: "Admin workspace for editing homepage text and images while keeping the current layout.",
}

export default async function Page() {
  await requireSession(["Admin"])

  return <HomePageManagementPage />
}
