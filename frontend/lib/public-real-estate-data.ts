import { cache } from "react"
import { headers } from "next/headers"

import type {
  PublicAgencySettings,
  BlogPostDetail,
  BlogPostSummary,
  HomePageSettings,
  PaginatedResult,
  PropertyItem,
  PublicAgentProfile,
  PublicPropertyFilters,
} from "@/@types/real-estate-api"
import { defaultAgencySettings } from "@/lib/agency-settings"
import { normalizeAgencySocialLinks } from "@/lib/agency-social-links"
import { cloneHomePageSettings, defaultHomePageSettings } from "@/lib/home-page-settings"

const baseUrl = process.env.BASE_URL ?? "http://localhost:4000/api"

type TenantPublicSite = {
  tenant: { businessName: string; subdomain: string }
  branding: { logoUrl?: string; tagline?: string; primaryColor?: string }
  homepage: { headline?: string; description?: string; phone?: string; email?: string; address?: string }
  listings: Array<{ id: number; title: string; status: string; payload?: Record<string, unknown> }>
}

const getTenantPublicSiteForRequest = cache(async (): Promise<TenantPublicSite | null> => {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-tenant-host")
  if (!host) return null
  try {
    const response = await fetch(`${baseUrl}/tenant-public/site`, {
      cache: "no-store",
      headers: { "x-tenant-host": host },
    })
    return response.ok ? ((await response.json()) as TenantPublicSite) : null
  } catch {
    return null
  }
})

function tenantProperty(item: TenantPublicSite["listings"][number]): PropertyItem {
  const payload = item.payload ?? {}
  return {
    id: item.id,
    title: item.title,
    slug: String(payload.slug ?? `property-${item.id}`),
    status: item.status === "published" ? "Open" : String(item.status),
    propertyType: String(payload.propertyType ?? "Residential") as PropertyItem["propertyType"],
    listingType: String(payload.listingType ?? "ForSale") as PropertyItem["listingType"],
    location: String(payload.location ?? payload.address ?? ""),
    price: String(payload.price ?? "Featured"),
    thumbnailUrl: String(payload.thumbnailUrl ?? payload.imageUrl ?? ""),
    ...payload,
  } as unknown as PropertyItem
}

async function fetchPublicJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

async function fetchCachedPublicJson<T>(path: string, tag: string): Promise<T | null> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      cache: "force-cache",
      next: {
        tags: [tag],
      },
    })

    if (!response.ok) {
      return null
    }

    return (await response.json()) as T
  } catch {
    return null
  }
}

export async function getFeaturedProperties(limit = 3) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) return tenantSite.listings.slice(0, limit).map(tenantProperty)

  const query = new URLSearchParams({
    page: "1",
    pageSize: `${limit}`,
    status: "Open",
  })
  const result = await fetchPublicJson<PaginatedResult<PropertyItem>>(`/properties?${query.toString()}`)

  return result?.items ?? []
}

export async function getPropertyBySlug(slug: string) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    return tenantSite.listings.map(tenantProperty).find((item) => item.slug === slug) ?? null
  }
  return fetchPublicJson<PropertyItem>(`/properties?slug=${encodeURIComponent(slug)}`)
}

export async function getSimilarProperties(property: Pick<PropertyItem, "listingType" | "propertyType" | "slug">) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    return tenantSite.listings
      .map(tenantProperty)
      .filter((item) => item.slug !== property.slug && item.listingType === property.listingType && item.propertyType === property.propertyType)
      .slice(0, 3)
  }

  const query = new URLSearchParams({
    page: "1",
    pageSize: "6",
    status: "Open",
    listingType: property.listingType,
    propertyType: property.propertyType,
  })
  const result = await fetchPublicJson<PaginatedResult<PropertyItem>>(`/properties?${query.toString()}`)

  return (result?.items ?? []).filter((item) => item.slug !== property.slug).slice(0, 3)
}

export async function getPublicAgents() {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) return []
  const agents = await fetchPublicJson<PublicAgentProfile[]>("/public/agents")
  return agents ?? []
}

export async function getPublicPropertyFilters(): Promise<PublicPropertyFilters> {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    const properties = tenantSite.listings.map(tenantProperty)
    return {
      propertyTypes: Array.from(new Set(properties.map((item) => item.propertyType))),
      listingTypes: Array.from(new Set(properties.map((item) => item.listingType))),
      locations: Array.from(new Set(properties.map((item) => item.location).filter(Boolean))),
    }
  }

  const filters = await fetchPublicJson<PublicPropertyFilters>("/properties/filters")

  return filters ?? {
    propertyTypes: ["Residential", "Commercial"] as Array<PropertyItem["propertyType"]>,
    listingTypes: ["ForSale", "ForRent"] as Array<PropertyItem["listingType"]>,
    locations: [],
  }
}

export async function getPublicHomePageSettings(): Promise<HomePageSettings> {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    const settings = cloneHomePageSettings(defaultHomePageSettings)
    if (tenantSite.homepage.headline) settings.hero.headline = tenantSite.homepage.headline
    if (tenantSite.homepage.description) settings.hero.description = tenantSite.homepage.description
    return settings
  }

  const settings = await fetchCachedPublicJson<HomePageSettings>("/public/homepage-settings", "homepage-settings")
  return settings ? settings : cloneHomePageSettings(defaultHomePageSettings)
}

export async function getPublicAgencySettings(): Promise<PublicAgencySettings> {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    return {
      profile: {
        agencyName: tenantSite.tenant.businessName,
        logo: { objectName: null, url: tenantSite.branding.logoUrl ?? "" },
        officeLocations: tenantSite.homepage.address ? [tenantSite.homepage.address] : [],
        contactEmail: tenantSite.homepage.email ?? "",
        contactPhone: tenantSite.homepage.phone ?? "",
        socialLinks: normalizeAgencySocialLinks([]),
      },
      updatedAt: "",
    }
  }

  const settings = await fetchPublicJson<PublicAgencySettings>("/public/agency-settings")

  if (settings) {
    return {
      ...settings,
      profile: {
        agencyName: settings.profile?.agencyName ?? defaultAgencySettings.profile.agencyName,
        logo: {
          objectName: settings.profile?.logo?.objectName ?? defaultAgencySettings.profile.logo.objectName ?? null,
          url: settings.profile?.logo?.url ?? defaultAgencySettings.profile.logo.url,
        },
        officeLocations: [...(settings.profile?.officeLocations ?? defaultAgencySettings.profile.officeLocations)],
        contactEmail: settings.profile?.contactEmail ?? defaultAgencySettings.profile.contactEmail,
        contactPhone: settings.profile?.contactPhone ?? defaultAgencySettings.profile.contactPhone,
        socialLinks: normalizeAgencySocialLinks(settings.profile?.socialLinks),
      },
    }
  }

  return {
    profile: {
      agencyName: defaultAgencySettings.profile.agencyName,
      logo: {
        objectName: defaultAgencySettings.profile.logo.objectName ?? null,
        url: defaultAgencySettings.profile.logo.url,
      },
      officeLocations: [...defaultAgencySettings.profile.officeLocations],
      contactEmail: defaultAgencySettings.profile.contactEmail,
      contactPhone: defaultAgencySettings.profile.contactPhone,
      socialLinks: normalizeAgencySocialLinks(defaultAgencySettings.profile.socialLinks),
    },
    updatedAt: "",
  }
}

export async function getBlogPosts(limit = 9) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) {
    return {
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: limit,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  }

  const query = new URLSearchParams({
    page: "1",
    pageSize: `${limit}`,
  })
  const result = await fetchPublicJson<PaginatedResult<BlogPostSummary>>(`/blogs?${query.toString()}`)

  return result ?? {
    items: [],
    totalCount: 0,
    page: 1,
    pageSize: limit,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  }
}

export async function getFeaturedBlogPosts(limit = 3) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) return []

  const query = new URLSearchParams({
    featuredOnly: "true",
    page: "1",
    pageSize: `${limit}`,
  })
  const result = await fetchPublicJson<PaginatedResult<BlogPostSummary>>(`/blogs?${query.toString()}`)

  return result?.items ?? []
}

export async function getBlogPostBySlug(slug: string) {
  const tenantSite = await getTenantPublicSiteForRequest()
  if (tenantSite) return null
  return fetchPublicJson<BlogPostDetail>(`/blogs/details?slug=${encodeURIComponent(slug)}`)
}
