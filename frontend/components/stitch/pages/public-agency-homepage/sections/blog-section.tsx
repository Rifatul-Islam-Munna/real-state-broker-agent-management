"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { usePublicBlogPosts } from "@/hooks/use-real-estate-api"
import { publicBlogHomeSectionContent } from "@/lib/public-blog-content"

function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function BlogSection() {
  const blogPostsQuery = usePublicBlogPosts({
    page: 1,
    pageSize: 6,
  })
  const posts = blogPostsQuery.data?.items ?? []
  const visiblePosts = posts.slice(0, 3)
  const isLoading = !blogPostsQuery.data && (blogPostsQuery.isLoading || blogPostsQuery.isFetching)

  return (
    <section className="py-20 bg-background-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-16 flex flex-col gap-5 text-center md:flex-row md:items-end md:justify-between md:text-left">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {publicBlogHomeSectionContent.eyebrow}
            </span>
            <h2 className="text-4xl font-black text-primary mt-2">
              {publicBlogHomeSectionContent.title}
            </h2>
          </div>
          <Link
            className="inline-flex items-center justify-center border-2 border-primary px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-primary transition-colors hover:bg-primary hover:text-white"
            href="/blog"
          >
            {publicBlogHomeSectionContent.buttonLabel}
          </Link>
        </div>
        {isLoading ? (
          <div className="border border-primary/10 bg-white px-8 py-14 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Loading blog feed"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {"Pulling the latest articles from the blog API now."}
            </p>
          </div>
        ) : blogPostsQuery.error ? (
          <div className="border border-primary/10 bg-white px-8 py-14 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Blog feed unavailable"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {blogPostsQuery.error.message}
            </p>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="border border-primary/10 bg-white px-8 py-14 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Blog feed unavailable"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {"The public homepage could not load blog posts from the backend right now."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {visiblePosts.map((post) => (
              <Link
                key={post.id}
                className="group flex h-full flex-col overflow-hidden border border-slate-200 bg-white transition-transform hover:-translate-y-1"
                href={`/blog/${post.slug}`}
              >
                <div className="overflow-hidden">
                  <img
                    alt={post.title}
                    className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                    src={post.coverImageUrl}
                  />
                </div>
                <div className="flex flex-1 flex-col p-8">
                  <div className="flex items-center justify-between gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="text-accent">
                      {post.category}
                    </span>
                    <span>
                      {`${post.readTimeMinutes} min read`}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-primary mt-4 mb-4 leading-tight group-hover:text-accent transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                    <span>
                      {formatBlogDate(post.publishedAt)}
                    </span>
                    <span className="text-primary group-hover:underline">
                      {"Read Post"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
