import type { Metadata } from "next"

type PageMeta = {
  title: string
  description: string
  routePath: string
}

export function buildPageMetadata(meta: PageMeta): Metadata {
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: meta.routePath,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.routePath,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  }
}
