/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useDeferredValue, useState } from "react"

import { usePublicBlogPosts } from "@/hooks/use-real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"

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
  const blogPostsQuery = usePublicBlogPosts({
    page: 1,
    pageSize: 12,
  })
  const posts = blogPostsQuery.data?.items ?? []
  const isLoading = !blogPostsQuery.data && (blogPostsQuery.isLoading || blogPostsQuery.isFetching)
  const normalizedSearch = deferredSearchValue.trim().toLowerCase()
  const categories = ["All Posts", ...new Set(posts.map((post) => post.category))]
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = activeCategory === "All Posts" || post.category === activeCategory
    const matchesSearch =
      normalizedSearch.length === 0 ||
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.excerpt.toLowerCase().includes(normalizedSearch) ||
      post.authorName.toLowerCase().includes(normalizedSearch) ||
      post.category.toLowerCase().includes(normalizedSearch)

    return matchesCategory && matchesSearch
  })
  const featuredPost = filteredPosts.find((post) => post.isFeatured) ?? filteredPosts[0] ?? null
  const recentPosts = featuredPost
    ? filteredPosts.filter((post) => post.slug !== featuredPost.slug)
    : filteredPosts

  return (
    <main>
      <section className="relative overflow-hidden bg-primary py-20 lg:py-28">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent" />
          <img
            alt="City skyline"
            className="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB89qxif0aNBxfzNGrQuA7oyDYyoPf7vzvB6eXmtR5_Gi4sWIA8ifj23yuoQkUHvfe2X93eCrQGH97vqBnJ_Cz81ERywyGTMQKyfgneaGkjezgwmyjJjxYCNv8Z4-xuxUjNh4ic016tITf-bpn_ALXfCCgw0y8RLGR7yMJd3CACVMByNbM9SukDbX0LwV609TvPItUzLCustIjXxprYPxm5ghVUitQ_gFGGs22WHSa8b-lj2DKAbcdjY83km9nPpcCJzhN_fXZ0i1Y"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8 lg:text-left">
          <p className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur">
            {"EstateBlue Journal"}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
            {"Fresh real estate analysis, buying guidance, and neighborhood signals from the EstateBlue team."}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/82 md:text-lg">
            {"Read practical market updates built for buyers, sellers, investors, and agents who want usable signals instead of filler."}
          </p>
        </div>
      </section>

      <section className="border-b border-primary/10 bg-white py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="relative w-full lg:max-w-md">
            <AppIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" name="search" />
            <Input
              className="h-auto w-full border border-primary/10 bg-background-light py-3 pr-4 pl-12 text-sm"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search articles, authors, or categories..."
              type="text"
              value={searchValue}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const isActive = category === activeCategory

              return (
                <button
                  key={category}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "bg-background-light text-primary hover:bg-primary/10"
                  }`}
                  onClick={() => setActiveCategory(category)}
                  type="button"
                >
                  {category}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="border border-primary/10 bg-white px-8 py-16 text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Loading blog feed"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {"Fetching the latest blog posts now."}
            </p>
          </div>
        ) : blogPostsQuery.error ? (
          <div className="border border-primary/10 bg-white px-8 py-16 text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"Blog feed unavailable"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {blogPostsQuery.error.message}
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="border border-primary/10 bg-white px-8 py-16 text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-secondary">
              {"No matching articles"}
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {"Try another search term or switch categories to see the rest of the blog feed."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {featuredPost ? (
                <div className="mb-16">
                  <h2 className="mb-6 text-xs font-black uppercase tracking-[0.3em] text-accent">
                    {"Featured Insight"}
                  </h2>
                  <Link className="group block" href={`/blog/${featuredPost.slug}`}>
                    <div className="aspect-[16/9] overflow-hidden border border-primary/10">
                      <img
                        alt={featuredPost.title}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={featuredPost.coverImageUrl}
                      />
                    </div>
                    <div className="space-y-4 pt-8">
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-widest text-primary/60">
                        <span>{featuredPost.category}</span>
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        <span>{formatBlogDate(featuredPost.publishedAt)}</span>
                        <span className="h-1 w-1 rounded-full bg-accent" />
                        <span>{`${featuredPost.readTimeMinutes} min read`}</span>
                      </div>
                      <h3 className="text-3xl font-bold leading-tight text-primary transition-colors group-hover:text-accent">
                        {featuredPost.title}
                      </h3>
                      <p className="text-lg leading-relaxed text-slate-600">
                        {featuredPost.excerpt}
                      </p>
                      <span className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-widest text-primary transition-all group-hover:border-accent group-hover:text-accent">
                        {"Read Full Article"}
                        <AppIcon className="text-sm" name="arrow_forward" />
                      </span>
                    </div>
                  </Link>
                </div>
              ) : null}

              <div>
                <div className="mb-8 flex items-center justify-between gap-4">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent">
                    {"Recent Articles"}
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {`${filteredPosts.length} Articles`}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                  {recentPosts.map((post) => (
                    <Link key={post.id} className="group block" href={`/blog/${post.slug}`}>
                      <div className="aspect-square overflow-hidden border border-primary/10">
                        <img
                          alt={post.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          src={post.coverImageUrl}
                        />
                      </div>
                      <div className="space-y-3 pt-6">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                            {post.category}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {`${post.readTimeMinutes} min`}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold leading-snug text-primary transition-colors group-hover:text-accent">
                          {post.title}
                        </h4>
                        <p className="text-sm leading-7 text-slate-500">
                          {post.excerpt}
                        </p>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          {`${formatBlogDate(post.publishedAt)} • ${post.authorName}`}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-10 lg:col-span-4">
              <div className="border border-primary/10 bg-white p-8">
                <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary">
                  <AppIcon className="text-accent" name="trending_up" />
                  {"Trending Topics"}
                </h3>
                <div className="space-y-6">
                  {posts.slice(0, 4).map((post, index) => (
                    <Link key={post.slug} className="group block" href={`/blog/${post.slug}`}>
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-accent">
                        {`#${index + 1} Trend`}
                      </span>
                      <p className="text-sm font-bold text-slate-800 transition-colors group-hover:text-primary">
                        {post.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="relative overflow-hidden bg-primary p-8 text-white">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold">
                    {"Want live property matches?"}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-white/80">
                    {"Use the public property search and contact team to turn any insight into an actual shortlist."}
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Link
                      className="bg-accent px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-white"
                      href="/property-search"
                    >
                      {"Browse Properties"}
                    </Link>
                    <Link
                      className="border border-white/20 px-5 py-3 text-center text-xs font-bold uppercase tracking-[0.22em] text-white"
                      href="/contact-us"
                    >
                      {"Talk To An Agent"}
                    </Link>
                  </div>
                </div>
                <AppIcon className="absolute -bottom-10 -right-10 rotate-12 select-none text-[120px] text-white/5" name="mail" />
              </div>

              <div className="border border-secondary/20 bg-secondary/10 p-8">
                <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-primary">
                  {"Fast Paths"}
                </h3>
                <div className="space-y-4 text-sm font-semibold text-slate-700">
                  <Link className="flex items-center justify-between gap-4 transition-colors hover:text-primary" href="/agents">
                    <span>{"Meet the EstateBlue agents"}</span>
                    <AppIcon className="text-sm" name="arrow_forward" />
                  </Link>
                  <Link className="flex items-center justify-between gap-4 transition-colors hover:text-primary" href="/profile/seller/list-your-property">
                    <span>{"List a property with us"}</span>
                    <AppIcon className="text-sm" name="arrow_forward" />
                  </Link>
                  <Link className="flex items-center justify-between gap-4 transition-colors hover:text-primary" href="/property-search">
                    <span>{"Explore current listings"}</span>
                    <AppIcon className="text-sm" name="arrow_forward" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
