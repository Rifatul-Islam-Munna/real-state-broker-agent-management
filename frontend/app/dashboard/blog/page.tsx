import type { Metadata } from "next"

import { BlogManagementPage } from "@/components/stitch/pages/blog-management/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Blog Management | EstateBlue",
  description: "Workspace for creating, editing, publishing, and maintaining public blog posts.",
}

export default async function Page() {
  await requireDashboardAccess(undefined, true)
  return <BlogManagementPage />
}
