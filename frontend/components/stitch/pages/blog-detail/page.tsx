import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { FooterSection } from "@/components/stitch/pages/market-insights-blog/sections/footer"
import { BlogPostDetailContent } from "@/components/stitch/pages/blog-detail/blog-detail-content"

type BlogPostDetailPageProps = {
  slug: string
}

export function BlogPostDetailPage({ slug }: BlogPostDetailPageProps) {
  return (
    <div className="bg-background-light text-[#1A2332]">
      <PublicPrimaryNavbar />
      <BlogPostDetailContent slug={slug} />
      <FooterSection />
    </div>
  )
}
