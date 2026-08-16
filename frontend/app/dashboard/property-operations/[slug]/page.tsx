import type { Metadata } from "next"

import { PropertyOperationsPlatformPage } from "@/components/property-operations-platform/platform-page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const title = slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
  return { title: `${title} | Property Operations` }
}

export default async function Page({ params }: Props) {
  await requireDashboardAccess("properties")
  const { slug } = await params
  return <PropertyOperationsPlatformPage slug={slug} />
}
