import type { Metadata } from "next"

import { BlogManagementPage } from "@/components/stitch/pages/blog-management/page"
import { requireSession } from "@/lib/auth-actions"

export const metadata: Metadata = {
  title: "Blog Management | EstateBlue Admin",
  description: "Admin workspace for creating, editing, publishing, and maintaining public blog posts.",
}

export default async function Page() {
  await requireSession(["Admin"])

  return <BlogManagementPage />
}
