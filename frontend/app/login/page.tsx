/* eslint-disable @next/next/no-img-element */

import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    redirect(getPortalHomePath(user))
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
    <div className="min-h-screen bg-muted/25 text-foreground">
      <PublicPrimaryNavbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_55%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.1),transparent_40%)]" />
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.16fr_0.84fr] lg:px-8 lg:py-10">
          <section className="overflow-hidden rounded-3xl border bg-card shadow-xl">
            <div className="relative min-h-[620px]">
              <div className="absolute inset-0">
                <img
                  alt="Luxury property entry view"
                  className="h-full w-full object-cover"
                  src={heroImage}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,0.86)_0%,rgba(15,23,42,0.46)_45%,rgba(37,99,235,0.58)_100%)]" />
              </div>

              <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-10">
                <div className="max-w-2xl">
                  <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                    {"EstateBlue workspace"}
                  </p>
                  <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-6xl">
                    {"Secure access for your complete real estate operation."}
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-7 text-white/78 md:text-lg">
                    {"Manage listings, lead flow, contact requests, and deal activity from a clean workspace connected to the same live data as your storefront."}
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-xs font-medium text-white/65">{"Active inventory"}</p>
                      <p className="mt-2 text-3xl font-semibold">{featuredPropertyFeed.totalCount}</p>
                    </article>
                    <article className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-xs font-medium text-white/65">{"Live showcase"}</p>
                      <p className="mt-2 text-3xl font-semibold">{featuredPropertyFeed.items.length}</p>
                    </article>
                    <article className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-white backdrop-blur">
                      <p className="text-xs font-medium text-white/65">{"Listing types"}</p>
                      <p className="mt-2 text-3xl font-semibold">{listingMix}</p>
                    </article>
                  </div>
                </div>

                <div className="grid gap-4 pt-10 md:grid-cols-3">
                  {featuredProperties.map((property) => (
                    <article
                      key={property.id}
                      className="rounded-2xl border border-white/15 bg-white/95 p-4 text-slate-900 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-primary">
                          {property.listingType === "ForRent" ? "For rent" : "For sale"}
                        </span>
                        <span className="rounded-lg border bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                          {property.status}
                        </span>
                      </div>
                      <h2 className="mt-4 text-lg font-semibold tracking-tight">{property.title}</h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        {property.location || property.exactLocation}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {property.exactLocation || "Live inventory from your public property API appears here."}
                      </p>
                      <p className="mt-5 text-base font-semibold text-primary">
                        {formatPriceLabel(property.price)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <Card className="shadow-xl">
              <CardHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  {"Welcome back"}
                </p>
                <CardTitle className="text-3xl">{"Sign in"}</CardTitle>
                <CardDescription>
                  {"Use your admin or agent account to enter the portal. The property preview is still loaded from the same public API."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LoginForm />
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardDescription className="text-primary-foreground/70">{"Portal coverage"}</CardDescription>
                  <CardTitle>{"Listings, leads, contacts, and deals"}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader>
                  <CardDescription>{"Live data"}</CardDescription>
                  <CardTitle>{"Property API connected"}</CardTitle>
                </CardHeader>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
