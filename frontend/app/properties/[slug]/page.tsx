import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PublicPropertyDetailPage } from "@/components/stitch/pages/public-property-detail/page"
import { getPropertyBySlug, getSimilarProperties } from "@/lib/public-real-estate-data"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const property = await getPropertyBySlug(slug)

  if (!property) {
    return {}
  }

  return {
    title: `${property.title} | EstateBlue`,
    description: property.description || `${property.title} in ${property.location || property.exactLocation}`,
    alternates: {
      canonical: `/properties/${property.slug}`,
    },
    openGraph: {
      title: `${property.title} | EstateBlue`,
      description: property.description || property.location || property.exactLocation,
      images: property.thumbnailUrl ? [{ url: property.thumbnailUrl }] : undefined,
      type: "website",
      url: `/properties/${property.slug}`,
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const property = await getPropertyBySlug(slug)

  if (!property) {
    notFound()
  }

  const relatedProperties = await getSimilarProperties(property)

  return <PublicPropertyDetailPage property={property} relatedProperties={relatedProperties} />
}
