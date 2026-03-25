import type {
  PaginatedResult,
  PropertyItem,
  PublicAgentProfile,
  PublicPropertyFilters,
} from "@/types/real-estate-api"

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
