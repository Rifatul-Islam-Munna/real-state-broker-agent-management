"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { usePublicBlogPostDetail } from "@/hooks/use-real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type BlogPostDetailContentProps = {
  slug: string
}

function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function BlogStateCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="border border-primary/10 bg-white px-8 py-16 text-center">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
          {title}
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>
    </main>
  )
}

export function BlogPostDetailContent({ slug }: BlogPostDetailContentProps) {
  const postQuery = usePublicBlogPostDetail(slug)
  const post = postQuery.data
  const isLoading = !post && (postQuery.isLoading || postQuery.isFetching)

  if (isLoading) {
    return <BlogStateCard description="Loading the latest article details now." title="Loading article" />
  }

  if (postQuery.error) {
    return <BlogStateCard description={postQuery.error.message} title="Article unavailable" />
  }

  if (!post) {
    return <BlogStateCard description="This article could not be found." title="Article not found" />
  }

  return (
    <main>
      <section className="border-b border-primary/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            <Link href="/">
              {"Home"}
            </Link>
            <span>{"/"}</span>
            <Link href="/blog">
              {"Blog"}
            </Link>
            <span>{"/"}</span>
            <span className="text-primary">
              {post.category}
            </span>
          </nav>
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-secondary">
                <span className="bg-secondary/10 px-3 py-2 text-secondary">
                  {post.category}
                </span>
                <span>{formatBlogDate(post.publishedAt)}</span>
                <span>{`${post.readTimeMinutes} min read`}</span>
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight text-primary md:text-6xl">
                {post.title}
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
                {post.excerpt}
              </p>
              <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-slate-500">
                <AppIcon className="text-primary" name="edit_square" />
                <span>{`By ${post.authorName}`}</span>
              </div>
            </div>
            <div className="overflow-hidden border border-primary/10 bg-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
              <img
                alt={post.title}
                className="h-full w-full object-cover"
                src={post.coverImageUrl}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="space-y-10">
            <div className="grid gap-4 md:grid-cols-3">
              {post.highlights.map((highlight) => (
                <div key={highlight} className="border border-primary/10 bg-white p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
                    {"Key Point"}
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-6 border border-primary/10 bg-white p-8 md:p-10">
              {post.paragraphs.map((paragraph, index) => (
                <p key={`${post.slug}-paragraph-${index + 1}`} className="text-base leading-8 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </div>

            <section>
              <div className="mb-6 flex items-center gap-3">
                <AppIcon className="text-accent" name="sell" />
                <h2 className="text-lg font-black uppercase tracking-[0.24em] text-primary">
                  {"Topics"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-primary/10 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          </article>

          <aside className="space-y-8">
            <div className="border border-primary/10 bg-white p-8">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
                {"Need the live market?"}
              </p>
              <h2 className="mt-4 text-2xl font-black text-primary">
                {"Turn this insight into a shortlist."}
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {"Browse the active inventory or connect with an EstateBlue agent to apply this article to current listings."}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  className="bg-primary px-5 py-3 text-center text-xs font-black uppercase tracking-[0.22em] text-white"
                  href="/property-search"
                >
                  {"Search Properties"}
                </Link>
                <Link
                  className="border border-primary px-5 py-3 text-center text-xs font-black uppercase tracking-[0.22em] text-primary"
                  href="/contact-us"
                >
                  {"Contact Team"}
                </Link>
              </div>
            </div>

            <div className="border border-primary/10 bg-white p-8">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
                {"Article Facts"}
              </p>
              <div className="mt-5 space-y-4 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4 border-b border-primary/5 pb-4">
                  <span>{"Author"}</span>
                  <span className="font-semibold text-slate-900">{post.authorName}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-primary/5 pb-4">
                  <span>{"Published"}</span>
                  <span className="font-semibold text-slate-900">{formatBlogDate(post.publishedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{"Reading time"}</span>
                  <span className="font-semibold text-slate-900">{`${post.readTimeMinutes} min`}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-xl font-black uppercase tracking-[0.24em] text-primary">
            {"Related Articles"}
          </h2>
          <Link className="text-xs font-black uppercase tracking-[0.22em] text-secondary" href="/blog">
            {"Back to Blog"}
          </Link>
        </div>
        {post.relatedPosts.length === 0 ? (
          <div className="border border-primary/10 bg-white p-8 text-center text-sm font-semibold text-slate-600">
            {"No related blog posts are available right now."}
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {post.relatedPosts.map((relatedPost) => (
              <Link
                key={relatedPost.id}
                className="group overflow-hidden border border-primary/10 bg-white"
                href={`/blog/${relatedPost.slug}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    alt={relatedPost.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={relatedPost.coverImageUrl}
                  />
                </div>
                <div className="space-y-3 p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                    {relatedPost.category}
                  </p>
                  <h3 className="text-lg font-black leading-snug text-primary transition-colors group-hover:text-accent">
                    {relatedPost.title}
                  </h3>
                  <p className="text-sm leading-7 text-slate-500">
                    {relatedPost.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
