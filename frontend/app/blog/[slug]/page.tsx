import type { Metadata } from "next"

import { BlogPostDetailPage } from "@/components/stitch/pages/blog-detail/page"
import { getBlogPostBySlug } from "@/lib/public-real-estate-data"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {}
  }

  return {
    title: `${post.title} | EstateBlue Blog`,
    description: post.excerpt,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | EstateBlue Blog`,
      description: post.excerpt,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : undefined,
      type: "article",
      url: `/blog/${post.slug}`,
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params

  return <BlogPostDetailPage slug={slug} />
}
