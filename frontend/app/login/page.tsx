/* eslint-disable @next/next/no-img-element */

import { Building2 } from "lucide-react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { getSessionUser } from "@/lib/auth-actions"
import { formatPriceLabel } from "@/lib/currency"
import { getPortalHomePath } from "@/lib/portal-paths"

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

const propertyPlaceholder = "https://placehold.co/1200x900/4f46e5/ffffff?text=EstateBlue"
const publicApiBaseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

async function getFeaturedPropertyFeed(): Promise<PropertyFeed> {
  try {
    const response = await fetch(`${publicApiBaseUrl}/properties?page=1&pageSize=3&status=Open`, {
      cache: "no-store",
    })
    if (!response.ok) return { items: [], totalCount: 0 }
    const payload = (await response.json()) as { items?: FeaturedProperty[]; totalCount?: number }
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
  if (user) {
    const requestHeaders = await headers()
    if (user.tenantId && requestHeaders.get("x-tenant-host")) redirect("/dashboard")
    redirect(getPortalHomePath(user))
  }

  const featuredPropertyFeed = await getFeaturedPropertyFeed()
  const featured = featuredPropertyFeed.items[0]
  const heroImage = featured?.thumbnailUrl ?? featured?.imageUrls?.[0] ?? propertyPlaceholder
  const activeValue = featured ? formatPriceLabel(featured.price) : "Live"
  const listingMix = new Set(featuredPropertyFeed.items.map((property) => property.listingType)).size

  return (
    <main className="grid min-h-screen bg-white text-[#0b1c30] lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.02fr_0.98fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#6668ff_0%,#4d4fe8_48%,#4343d5_100%)] px-10 py-10 text-white lg:flex lg:flex-col xl:px-16 xl:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-36 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 right-0 size-96 rounded-full bg-[#71f8e4]/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
              <Building2 className="size-7" />
            </span>
            <span className="text-2xl font-bold tracking-[-0.03em]">EstateBlue</span>
          </div>

          <div className="mt-20 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur">
              <span className="size-1.5 rounded-full bg-[#71f8e4]" />
              Enterprise workspace
            </div>
            <h1 className="mt-8 max-w-[660px] text-5xl font-bold leading-[1.12] tracking-[-0.035em] xl:text-[58px]">
              The standard for modern real estate operations.
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-8 text-white/72 xl:text-xl">
              A unified platform for high-volume agencies to manage listings, lead distribution, and transaction workflows with institutional-grade security.
            </p>
          </div>

          <div className="mt-auto overflow-hidden rounded-t-[32px] border border-b-0 border-white/10 bg-white/[0.035] p-7 pb-0 shadow-2xl backdrop-blur-xl">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex gap-2">
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
                <span className="size-2.5 rounded-full bg-white/20" />
              </div>
              <span className="h-4 w-48 rounded-full bg-white/5" />
            </div>

            <div className="grid grid-cols-12 gap-5 pb-8 [mask-image:linear-gradient(to_bottom,black_72%,transparent_100%)]">
              <div className="col-span-8 space-y-5">
                <div className="relative h-52 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <img alt={featured?.title ?? "Featured property"} className="h-full w-full object-cover" src={heroImage} />
                  <div className="absolute inset-0 bg-[#4343d5]/10 mix-blend-overlay" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <span className="h-16 rounded-xl border border-white/10 bg-white/5" />
                  <span className="h-16 rounded-xl border border-white/10 bg-white/5" />
                </div>
              </div>
              <div className="col-span-4 space-y-5">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">Active inventory</p>
                  <p className="mt-2 text-3xl font-bold">{featuredPropertyFeed.totalCount.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">Featured value</p>
                  <p className="mt-2 truncate text-2xl font-bold">{activeValue}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">Listing types</p>
                  <p className="mt-2 text-2xl font-bold">{listingMix}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-white px-6 py-10 sm:px-10 lg:px-14 xl:px-20">
        <div className="w-full max-w-[430px]">
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-xl bg-[#4343d5] text-white shadow-lg shadow-[#4343d5]/20">
              <Building2 className="size-6" />
            </span>
            <span className="text-xl font-bold tracking-[-0.03em]">EstateBlue</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-[#0b1c30] sm:text-[34px]">Sign in to Enterprise</h2>
            <p className="mt-2 text-[15px] leading-6 text-[#464555]">Enter your credentials to access your secure portal.</p>
          </div>

          <LoginForm />

          <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[#c7c4d7]/40 pt-8">
            <div className="flex gap-4">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#767586]">Privacy</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#767586]">Security</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#767586]/70">© {new Date().getFullYear()} EstateBlue</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
