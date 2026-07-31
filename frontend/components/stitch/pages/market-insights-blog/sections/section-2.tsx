/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useDeferredValue, useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { usePublicBlogPosts } from "@/hooks/use-real-estate-api"

function formatBlogDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

export function Section2Section() {
  const [searchValue, setSearchValue] = useState("")
  const [activeCategory, setActiveCategory] = useState("All Posts")
  const deferredSearchValue = useDeferredValue(searchValue)
  const categorySourceQuery = usePublicBlogPosts({ page: 1, pageSize: 200 })
  const blogPostsQuery = usePublicBlogPosts({
    category: activeCategory === "All Posts" ? undefined : activeCategory,
    page: 1,
    pageSize: 12,
    search: deferredSearchValue.trim() || undefined,
  })
  const posts = useMemo(() => blogPostsQuery.data?.items ?? [], [blogPostsQuery.data?.items])
  const categorySourcePosts = useMemo(
    () => categorySourceQuery.data?.items ?? [],
    [categorySourceQuery.data?.items],
  )
  const isLoading = !blogPostsQuery.data && (blogPostsQuery.isLoading || blogPostsQuery.isFetching)

  const categories = useMemo(
    () => [
      "All Posts",
      ...Array.from(
        new Set(
          categorySourcePosts
            .map((post) => post.category.trim())
            .filter(Boolean),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    ],
    [categorySourcePosts],
  )

  const featuredPost = posts.find((post) => post.isFeatured) ?? posts[0] ?? null
  const secondaryPosts = featuredPost
    ? posts.filter((post) => post.slug !== featuredPost.slug)
    : posts
  const trendingPosts = posts.slice(0, 3)

  return (
    <main className="bg-[#f8f9ff] text-[#0b1c30]">
      <section className="relative overflow-hidden bg-[#4343d5] py-20 sm:py-24">
        <div className="absolute inset-0 opacity-15">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,white,transparent_38%)]" />
        </div>
        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> Editorial Insights
          </span>
          <h1 className="mt-7 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-[-0.045em] text-white sm:text-6xl">
            Strategic signals for the modern real estate landscape.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            Expert analysis, neighborhood trends, and practical guidance for buyers, sellers, investors, and agents.
          </p>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div className="flex gap-6 overflow-x-auto">
            {categories.map((category) => {
              const active = category === activeCategory
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`whitespace-nowrap border-b-2 py-2 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                    active ? "border-[#4343d5] text-[#4343d5]" : "border-transparent text-slate-600 hover:text-[#4343d5]"
                  }`}
                >
                  {category}
                </button>
              )
            })}
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8f9ff] px-4">
            <AppIcon name="search" className="text-lg text-slate-400" />
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search articles..."
              className="w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 lg:w-64"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:px-10 lg:py-20">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-sm text-slate-500">Loading articles...</div>
        ) : blogPostsQuery.error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-14 text-center text-sm text-red-600">{blogPostsQuery.error.message}</div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center text-sm text-slate-500">No matching articles found.</div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              {featuredPost ? (
                <article>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4343d5]">Cover Story</p>
                  <Link href={`/blog/${featuredPost.slug}`} className="group mt-4 block">
                    <div className="aspect-[16/10] overflow-hidden rounded-[28px] bg-slate-200 shadow-[0_18px_45px_rgba(67,67,213,.08)]">
                      <img src={featuredPost.coverImageUrl} alt={featuredPost.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    </div>
                    <div className="mt-7">
                      <div className="flex flex-wrap items-center gap-3 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
                        <span>{featuredPost.category}</span><span>•</span><span>{formatBlogDate(featuredPost.publishedAt)}</span><span>•</span><span>{featuredPost.readTimeMinutes} min read</span>
                      </div>
                      <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.03em] transition group-hover:text-[#4343d5] sm:text-5xl">{featuredPost.title}</h2>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">{featuredPost.excerpt}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#4343d5]">Read Full Article <AppIcon name="arrow_forward" className="text-sm" /></span>
                    </div>
                  </Link>
                </article>
              ) : null}

              {secondaryPosts.length ? (
                <div className="mt-14 grid gap-8 border-t border-slate-200 pt-10 md:grid-cols-2">
                  {secondaryPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group">
                      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-200">
                        <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      </div>
                      <p className="mt-5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#006b5f]">{post.category}</p>
                      <h3 className="mt-3 text-xl font-semibold leading-snug transition group-hover:text-[#4343d5]">{post.title}</h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="space-y-8">
              <div>
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4343d5]">Trending Now</h3>
                  <AppIcon name="trending_up" className="text-lg text-[#4343d5]" />
                </div>
                <div className="mt-5 space-y-6">
                  {trendingPosts.map((post, index) => (
                    <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex gap-4">
                      <span className="text-3xl font-light text-[#c1c1ff]">0{index + 1}</span>
                      <div><p className="text-sm font-medium leading-5 group-hover:text-[#4343d5]">{post.title}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">{post.readTimeMinutes} min read</p></div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#4343d5]/10 bg-[#eef0ff] p-7">
                <h3 className="text-lg font-semibold">Looking for something specific?</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">Browse current listings or speak directly with an advisor.</p>
                <div className="mt-5 grid gap-3">
                  <Link href="/property-search" className="rounded-xl bg-[#4343d5] px-4 py-3 text-center text-xs font-bold text-white">Browse Properties</Link>
                  <Link href="/contact-us" className="rounded-xl border border-[#4343d5] px-4 py-3 text-center text-xs font-bold text-[#4343d5]">Contact Us</Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
