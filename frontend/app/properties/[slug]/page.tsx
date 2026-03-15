import { notFound } from "next/navigation"

import { PublicPropertyDetailPage } from "@/components/stitch/pages/public-property-detail/page"
import { publicPropertyDetailPageMeta } from "@/static-data/pages/public-property-detail/meta"
import { buildPageMetadata } from "@/lib/build-page-metadata"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return [{ slug: publicPropertyDetailPageMeta.slug }]
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params

  if (slug !== publicPropertyDetailPageMeta.slug) {
    return {}
  }

  return buildPageMetadata(publicPropertyDetailPageMeta)
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params

  if (slug !== publicPropertyDetailPageMeta.slug) {
    notFound()
  }

  return <PublicPropertyDetailPage />
}
