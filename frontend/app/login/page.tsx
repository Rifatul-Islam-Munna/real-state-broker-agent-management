/* eslint-disable @next/next/no-img-element */

import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { getSessionUser } from "@/lib/auth-actions"
import { formatPriceLabel } from "@/lib/currency"

type FeaturedProperty = {
  id: number
  title: string
  location: string
  exactLocation: string
  price: string
  status: "Open" | "Closed"
  listingType: "ForSale" | "ForRent"
  thumbnailUrl?: string | null
  imageUrls: string[]
}

type PropertyFeed = {
  items: FeaturedProperty[]
  totalCount: number
}

const propertyPlaceholder = "https://placehold.co/1200x900/e2e8f0/0f172a?text=EstateBlue"
const publicApiBaseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function getFeaturedPropertyFeed(): Promise<PropertyFeed> {
  try {
    const response = await fetch(`${publicApiBaseUrl}/properties?page=1&pageSize=3&status=Open`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return { items: [], totalCount: 0 }
    }

    const payload = (await response.json()) as {
      items?: FeaturedProperty[]
      totalCount?: number
    }

    return {
      items: payload.items ?? [],
      totalCount: payload.totalCount ?? payload.items?.length ?? 0,
    }
  } catch {
    return { items: [], totalCount: 0 }
  }
}

export default async function LoginPage() {
  const user = await getSessionUser()
  const featuredPropertyFeed = await getFeaturedPropertyFeed()

  if (user) {
    redirect(user.role === "Agent" ? "/agent/dashboard" : "/admin/dashboard")
  }

  const heroImage =
    featuredPropertyFeed.items[0]?.thumbnailUrl ??
    featuredPropertyFeed.items[0]?.imageUrls?.[0] ??
    propertyPlaceholder
  const listingMix = new Set(
    featuredPropertyFeed.items.map((property) =>
      property.listingType === "ForRent" ? "For Rent" : "For Sale",
    ),
  ).size
  const featuredProperties =
    featuredPropertyFeed.items.length > 0
      ? featuredPropertyFeed.items
      : [
          {
            id: 0,
            title: "Luxury Property Showcase",
            location: "Portfolio synced from API",
            exactLocation: "Your public listings appear here once properties are added.",
            price: "Ready for live inventory",
            status: "Open" as const,
            listingType: "ForSale" as const,
            imageUrls: [],
          },
        ]

  return (
    <div className="min-h-screen bg-background-light text-[#1A2332]">
      <PublicPrimaryNavbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(27,94,138,0.14),transparent_55%),radial-gradient(circle_at_top_right,rgba(232,148,58,0.16),transparent_40%)]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-8 lg:grid-cols-[1.16fr_0.84fr] lg:px-10 lg:py-12">
          <section className="overflow-hidden border border-primary/10 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.1)]">
            <div className="relative min-h-[620px]">
              <div className="absolute inset-0">
                <img
                  alt="Luxury property entry view"
                  className="h-full w-full object-cover"
                  src={heroImage}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.78)_0%,rgba(15,23,42,0.34)_45%,rgba(27,94,138,0.55)_100%)]" />
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/85 backdrop-blur">
                    {"EstateBlue Control Center"}
                  </p>
                  <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
                    {"Secure access built with the same visual language as your public home page."}
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/78 md:text-lg">
                    {"Sign in to manage listings, lead flow, contact requests, and deal activity while keeping the portal aligned with the storefront design system."}
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <article className="border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">
                        {"Active Inventory"}
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {featuredPropertyFeed.totalCount}
                      </p>
                    </article>
                    <article className="border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">
                        {"Live Showcase"}
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {featuredPropertyFeed.items.length}
                      </p>
                    </article>
                    <article className="border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/65">
                        {"Listing Mix"}
                      </p>
                      <p className="mt-3 text-3xl font-black">
                        {listingMix}
                      </p>
                    </article>
                  </div>
                </div>

                <div className="grid gap-4 pt-10 md:grid-cols-3">
                  {featuredProperties.map((property) => (
                    <article
                      key={property.id}
                      className="border border-white/15 bg-white/92 p-4 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                          {property.listingType === "ForRent" ? "For Rent" : "For Sale"}
                        </span>
                        <span className="border border-primary/10 bg-primary/5 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary">
                          {property.status}
                        </span>
                      </div>
                      <h2 className="mt-4 text-xl font-black tracking-tight">
                        {property.title}
                      </h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {property.location || property.exactLocation}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {property.exactLocation || "Live inventory from your public property API appears here."}
                      </p>
                      <p className="mt-5 text-lg font-black text-accent">
                        {formatPriceLabel(property.price)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="border border-primary/10 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] md:p-8">
              <div className="border-b border-slate-200 pb-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-secondary">
                  {"Welcome Back"}
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
                  {"Sign In"}
                </h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
                  {"Use your admin or agent account to enter the portal. The public listings preview on this page is loaded from the same property API that powers the storefront."}
                </p>
              </div>

              <div className="pt-6">
                <LoginForm />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="border border-primary/10 bg-primary px-5 py-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">
                  {"Portal Coverage"}
                </p>
                <h3 className="mt-3 text-2xl font-black">
                  {"Listings, leads, contacts, deals"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/76">
                  {"Admin and agent routes stay inside the same EstateBlue design system instead of switching to a different auth theme."}
                </p>
              </article>
              <article className="border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  {"Live Data"}
                </p>
                <h3 className="mt-3 text-2xl font-black text-slate-900">
                  {"Property API connected"}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {"As soon as you add or update public properties, the login showcase and homepage inventory can reflect the same source data."}
                </p>
              </article>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
