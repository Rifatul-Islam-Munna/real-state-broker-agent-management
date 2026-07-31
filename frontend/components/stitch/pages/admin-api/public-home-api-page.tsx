/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { ArrowRight, MapPin, Search } from "lucide-react"

import { PublicSiteFooter } from "@/components/stitch/shared/public-site-footer"
import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"

import {
  getFeaturedBlogPosts,
  getFeaturedProperties,
  getPublicAgencySettings,
  getPublicAgents,
  getPublicHomePageSettings,
  getPublicPropertyFilters,
} from "@/lib/public-real-estate-data"

const fallbackImage =
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85"

export async function PublicHomeApiPage() {
  const [properties, settings, agents, filters, agency, blogPosts] = await Promise.all([
    getFeaturedProperties(4),
    getPublicHomePageSettings(),
    getPublicAgents(),
    getPublicPropertyFilters(),
    getPublicAgencySettings(),
    getFeaturedBlogPosts(3),
  ])

  const brand = agency.profile.agencyName || "Ether Real Estate"
  const heroImage = settings.hero.backgroundImage?.url || properties[0]?.thumbnailUrl || fallbackImage
  const neighborhoodCards = settings.neighborhoods.cards.slice(0, 4)
  const visibleAgents = agents.slice(0, 4)
  const visibleBlogs = blogPosts.slice(0, 3)

  return (
    <div className="min-h-screen bg-white font-sans text-[#09111f]">
      <PublicPrimaryNavbar />

<main>
        <section className="overflow-hidden bg-white">
          <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:py-20">
            <div className="max-w-2xl">
              <div className="mb-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#4343d5]">
                <span className="h-px w-10 bg-[#4343d5]" /> Established Excellence
              </div>
              <h1 className="max-w-xl text-5xl font-extrabold leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                {settings.hero.headline}{" "}
                <span className="text-[#4343d5]">{settings.hero.highlightedHeadline}</span>
              </h1>
              <p className="mt-6 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">{settings.hero.description}</p>

              <form action="/property-search" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_35px_rgba(15,23,42,.12)] sm:flex-row">
                <div className="flex flex-1 items-center gap-3 px-3">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input name="location" placeholder={settings.hero.buyMode.inputPlaceholder} className="w-full border-0 bg-transparent py-3 text-sm outline-none ring-0 placeholder:text-slate-400" />
                </div>
                <select name="propertyType" className="rounded-lg border-0 bg-transparent px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-700 outline-none">
                  {filters.propertyTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
                <button className="rounded-lg bg-[#4343d5] px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-white">Search</button>
              </form>

              <div className="mt-8 flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                <div className="flex -space-x-2">
                  {[0, 1, 2].map((item) => <span key={item} className="h-8 w-8 rounded-full border-2 border-white bg-[#dfe4ff]" />)}
                </div>
                {agents.length || 500}+ advisors worldwide
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[580px]">
              <div className="aspect-[.88] overflow-hidden rounded-[34px] bg-slate-200 shadow-2xl">
                <img src={heroImage} alt="Featured property" className="h-full w-full object-cover" />
              </div>
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-7">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4343d5]">Curated listing</p>
                    <h2 className="mt-1 text-sm font-semibold">{properties[0]?.title || settings.featuredListings.title}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{properties[0]?.location || filters.locations[0] || "Prime location"}</p>
                  </div>
                  <p className="text-xl font-semibold text-[#4343d5]">{properties[0]?.price || "Featured"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4343d5]">{settings.neighborhoods.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{settings.neighborhoods.title}</h2>
              </div>
              <Link href="/properties" className="inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[#4343d5]">Explore all locations <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {neighborhoodCards.map((item) => (
                <Link href={`/property-search?location=${encodeURIComponent(item.name)}`} key={item.name} className="group relative aspect-[.76] overflow-hidden rounded-3xl bg-slate-200">
                  <img src={item.image.url || fallbackImage} alt={item.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 p-5 text-white">
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/80">{item.propertyCountLabel}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-[#f5f7ff] py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4343d5]">{settings.team.eyebrow}</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{settings.team.title}</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">Connect with experienced advisors who combine local knowledge, responsive service, and precise market guidance.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleAgents.map((agent, index) => (
                <Link href="/agents" key={agent.id} className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-slate-100">
                    <img src={agent.avatarUrl || fallbackImage} alt={agent.fullName} className="h-full w-full object-cover grayscale" />
                  </div>
                  <span className="relative -mt-3 inline-block rounded-full bg-[#4343d5] px-3 py-1 text-[8px] font-bold uppercase tracking-wider text-white">{index === 0 ? "Director" : "Advisor"}</span>
                  <h3 className="mt-3 font-semibold">{agent.fullName}</h3>
                  <p className="mt-1 text-xs text-slate-500">{agent.agencyName || brand}</p>
                  <div className="mt-5 grid grid-cols-2 border-t border-slate-100 pt-4 text-center">
                    <div><strong className="block text-lg text-[#4343d5]">{agent.propertyCount}</strong><span className="text-[8px] uppercase tracking-wider text-slate-400">Listings</span></div>
                    <div><strong className="block text-lg text-[#4343d5]">{agent.isVerifiedAgent ? "100%" : "Active"}</strong><span className="text-[8px] uppercase tracking-wider text-slate-400">Verified</span></div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#4343d5]">{settings.blog.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{settings.blog.title}</h2>
              </div>
              <Link href="/blog" className="rounded-lg border border-[#4343d5] px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#4343d5]">{settings.blog.buttonLabel}</Link>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {visibleBlogs.map((post) => (
                <Link href={`/blog/${post.slug}`} key={post.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-52 overflow-hidden bg-slate-100"><img src={post.coverImageUrl || fallbackImage} alt={post.title} className="h-full w-full object-cover" /></div>
                  <div className="p-6">
                    <div className="flex gap-3 text-[8px] font-bold uppercase tracking-wider text-slate-400"><span>{post.category}</span><span>•</span><span>{post.readTimeMinutes} min read</span></div>
                    <h3 className="mt-4 text-lg font-semibold leading-snug">{post.title}</h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-[#4343d5]">Read article <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
