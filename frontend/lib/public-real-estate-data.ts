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
  const query = new URLSearchParams({
    page: "1",
    pageSize: `${limit}`,
    status: "Open",
  })
  const result = await fetchPublicJson<PaginatedResult<PropertyItem>>(`/properties?${query.toString()}`)

  return result?.items ?? []
}

export async function getPropertyBySlug(slug: string) {
  return fetchPublicJson<PropertyItem>(`/properties?slug=${encodeURIComponent(slug)}`)
}

export async function getSimilarProperties(property: Pick<PropertyItem, "listingType" | "propertyType" | "slug">) {
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
  const agents = await fetchPublicJson<PublicAgentProfile[]>("/public/agents")
  return agents ?? []
}

export async function getPublicPropertyFilters(): Promise<PublicPropertyFilters> {
  const filters = await fetchPublicJson<PublicPropertyFilters>("/properties/filters")

  return filters ?? {
    propertyTypes: ["Residential", "Commercial"] as Array<PropertyItem["propertyType"]>,
    listingTypes: ["ForSale", "ForRent"] as Array<PropertyItem["listingType"]>,
    locations: [],
  }
}

export async function getPublicHomePageSettings(): Promise<HomePageSettings> {
  const settings = await fetchCachedPublicJson<HomePageSettings>("/public/homepage-settings", "homepage-settings")
  return settings ? settings : cloneHomePageSettings(defaultHomePageSettings)
}

export async function getPublicAgencySettings(): Promise<PublicAgencySettings> {
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
  const query = new URLSearchParams({
    featuredOnly: "true",
    page: "1",
    pageSize: `${limit}`,
  })
  const result = await fetchPublicJson<PaginatedResult<BlogPostSummary>>(`/blogs?${query.toString()}`)

  return result?.items ?? []
}

export async function getBlogPostBySlug(slug: string) {
  return fetchPublicJson<BlogPostDetail>(`/blogs/details?slug=${encodeURIComponent(slug)}`)
}
