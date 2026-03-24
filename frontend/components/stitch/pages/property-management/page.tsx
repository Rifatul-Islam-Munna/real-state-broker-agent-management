"use client"

import { useMemo, useState } from "react"

import {
  type PropertyItem,
  useCreateProperty,
  useProperties,
  useUpdateProperty,
} from "@/hooks/use-real-estate-api"
import { propertyHeroImage } from "@/lib/admin-portal"

import {
  AddPropertyModalOverlaySection,
  type PropertyFormValues,
  Section1Section,
  type PropertyManagementFilter,
  type PropertyManagementListing,
} from "./sections"

const PAGE_SIZE = 10

type PropertyModalState =
  | { mode: "create" }
  | { mode: "edit"; property: PropertyItem }
  | null

function createEmptyPropertyForm(): PropertyFormValues {
  return {
    title: "",
    propertyType: "Residential",
    listingType: "ForSale",
    price: "",
    status: "Open",
    location: "",
    exactLocation: "",
    bedRoom: "",
    bathRoom: "",
    width: "",
    description: "",
    keyAmenities: [],
    neighborhoodInsights: [{ type: "", description: "" }],
    thumbnailUrl: "",
    thumbnailObjectName: "",
    imageUrls: [],
    imageObjectNames: [],
  }
}

function mapPropertyToFormValues(property: PropertyItem): PropertyFormValues {
  return {
    title: property.title ?? "",
    propertyType: property.propertyType ?? "Residential",
    listingType: property.listingType ?? "ForSale",
    price: property.price ?? "",
    status: property.status ?? "Open",
    location: property.location ?? "",
    exactLocation: property.exactLocation ?? "",
    bedRoom: property.bedRoom ?? "",
    bathRoom: property.bathRoom ?? "",
    width: property.width ?? "",
    description: property.description ?? "",
    thumbnailUrl: property.thumbnailUrl ?? "",
    thumbnailObjectName: property.thumbnailObjectName ?? "",
    imageUrls: property.imageUrls ?? [],
    imageObjectNames: property.imageObjectNames ?? [],
    keyAmenities: property.keyAmenities ?? [],
    neighborhoodInsights:
      (property.neighborhoodInsights ?? []).length > 0
        ? (property.neighborhoodInsights ?? []).map((insight) => ({
            description: insight.description ?? "",
            type: insight.title ?? "",
          }))
        : [{ type: "", description: "" }],
  }
}

function buildPropertyPayload(
  values: PropertyFormValues,
  property?: PropertyItem,
): Omit<PropertyItem, "id" | "slug" | "agent" | "createdAt" | "updatedAt"> | PropertyItem {
  const payload = {
    agentId: property?.agentId ?? property?.agent?.id ?? null,
    bathRoom: values.bathRoom?.trim() ?? "",
    bedRoom: values.bedRoom?.trim() ?? "",
    description: values.description?.trim() ?? "",
    exactLocation: values.exactLocation?.trim() ?? "",
    imageObjectNames: values.imageObjectNames ?? [],
    imageUrls: values.imageUrls ?? [],
    keyAmenities: values.keyAmenities ?? [],
    listingType: values.listingType ?? "ForSale",
    location: values.location?.trim() ?? "",
    neighborhoodInsights: (values.neighborhoodInsights ?? [])
      .map((item) => ({
        description: item.description?.trim() ?? "",
        title: item.type?.trim() ?? "",
      }))
      .filter((item) => item.title || item.description),
    price: values.price?.trim() ?? "",
    propertyType: values.propertyType ?? "Residential",
    status: values.status ?? "Open",
    thumbnailObjectName: values.thumbnailObjectName?.trim() || null,
    thumbnailUrl: values.thumbnailUrl?.trim() || null,
    title: values.title?.trim() ?? "",
    width: values.width?.trim() ?? "",
  }

  if (!property) {
    return payload
  }

  return {
    ...property,
    ...payload,
  }
}

function getDaysOnMarket(createdAt: string) {
  const createdDate = new Date(createdAt)

  if (Number.isNaN(createdDate.getTime())) {
    return 0
  }

  return Math.max(0, Math.ceil((Date.now() - createdDate.getTime()) / 86_400_000))
}

export function PropertyManagementPage() {
  const [activeFilter, setActiveFilter] = useState<PropertyManagementFilter>("all")
  const [activeType, setActiveType] = useState<"All" | "Residential" | "Commercial">("All")
  const [activeAgent, setActiveAgent] = useState("")
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalState, setModalState] = useState<PropertyModalState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const propertiesQuery = useProperties({
    agent: activeAgent || undefined,
    page,
    pageSize: PAGE_SIZE,
    propertyType: activeType === "All" ? undefined : activeType,
    search: searchTerm || undefined,
    status:
      activeFilter === "open" || activeFilter === "long-open"
        ? "Open"
        : activeFilter === "closed"
          ? "Closed"
          : undefined,
  })

  const createPropertyMutation = useCreateProperty()
  const updatePropertyMutation = useUpdateProperty()

  const rawProperties = propertiesQuery.data?.items ?? []
  const isInitialLoading = !propertiesQuery.data && (propertiesQuery.isLoading || propertiesQuery.isFetching)

  const listings = useMemo<PropertyManagementListing[]>(
    () =>
      rawProperties
        .map((property) => ({
          addressLine1: property.title ?? "Untitled Property",
          addressLine2: property.exactLocation ?? property.location ?? "Location pending",
          agent: property.agent?.fullName ?? "Unassigned",
          daysOnMarket: getDaysOnMarket(property.createdAt ?? ""),
          id: property.id,
          imageAlt: property.title ?? "Property",
          imageSrc: propertyHeroImage(property),
          listingType:
            (property.listingType === "ForRent" ? "For Rent" : "For Sale") as "For Sale" | "For Rent",
          price: property.price ?? "",
          propertyType: property.propertyType ?? "Residential",
          slug: property.slug ?? "",
          status: property.status ?? "Open",
        }))
        .filter((property) => (activeFilter === "long-open" ? property.daysOnMarket >= 45 : true)),
    [activeFilter, rawProperties],
  )

  const statusCards = useMemo(
    () => [
      {
        label: "Total Listings",
        icon: "domain",
        value: propertiesQuery.data?.totalCount ?? 0,
        detail: "Matching the current search",
      },
      {
        label: "Open Listings",
        icon: "verified",
        value: rawProperties.filter((property) => (property.status ?? "Open") === "Open").length,
        detail: "Visible on this page",
      },
      {
        label: "Closed Listings",
        icon: "inventory_2",
        value: rawProperties.filter((property) => (property.status ?? "Open") === "Closed").length,
        detail: "Visible on this page",
      },
      {
        label: "Long Open",
        icon: "trending_up",
        value: rawProperties.filter(
          (property) => (property.status ?? "Open") === "Open" && getDaysOnMarket(property.createdAt ?? "") >= 45,
        ).length,
        detail: "Need follow-up now",
      },
    ],
    [propertiesQuery.data?.totalCount, rawProperties],
  )

  const visibleAgents = useMemo(
    () =>
      Array.from(
        new Set(rawProperties.map((property) => property.agent?.fullName ?? "").filter(Boolean)),
      ) as string[],
    [rawProperties],
  )

  const initialFormValues = useMemo(() => {
    if (modalState?.mode === "edit") {
      return mapPropertyToFormValues(modalState.property)
    }

    return createEmptyPropertyForm()
  }, [modalState])

  async function handlePropertySubmit(values: PropertyFormValues) {
    setSubmitError(null)

    if (modalState?.mode === "edit") {
      const response = await updatePropertyMutation.mutateAsync(
        buildPropertyPayload(values, modalState.property) as PropertyItem,
      )

      if (response.error) {
        setSubmitError(response.error.message)
        return false
      }
    } else {
      const response = await createPropertyMutation.mutateAsync(
        buildPropertyPayload(values) as Omit<PropertyItem, "id" | "slug" | "agent" | "createdAt" | "updatedAt">,
      )

      if (response.error) {
        setSubmitError(response.error.message)
        return false
      }
    }

    setModalState(null)
    return true
  }

  return (
    <>
      <Section1Section
        activeAgent={activeAgent}
        activeFilter={activeFilter}
        activeType={activeType}
        currentPage={page}
        errorMessage={propertiesQuery.error?.message ?? null}
        isLoading={isInitialLoading}
        listings={listings}
        onAddPropertyClick={() => {
          setSubmitError(null)
          setModalState({ mode: "create" })
        }}
        onAgentChange={(agent) => {
          setActiveAgent(agent)
          setPage(1)
        }}
        onEditPropertyClick={(propertyId) => {
          const property = rawProperties.find((item) => item.id === propertyId)

          if (!property) {
            return
          }

          setSubmitError(null)
          setModalState({ mode: "edit", property })
        }}
        onFilterChange={(filter) => {
          setActiveFilter(filter)
          setPage(1)
        }}
        onPageChange={setPage}
        onSearchChange={(value) => {
          setSearchTerm(value)
          setPage(1)
        }}
        onTypeChange={(type) => {
          setActiveType(type)
          setPage(1)
        }}
        searchTerm={searchTerm}
        statusCards={statusCards}
        totalPages={propertiesQuery.data?.totalPages ?? 1}
        totalResults={propertiesQuery.data?.totalCount ?? listings.length}
        visibleAgents={visibleAgents}
      />
      {modalState ? (
        <AddPropertyModalOverlaySection
          initialValues={initialFormValues}
          isSubmitting={createPropertyMutation.isPending || updatePropertyMutation.isPending}
          mode={modalState.mode}
          onClose={() => setModalState(null)}
          onSubmit={handlePropertySubmit}
          submitError={submitError}
        />
      ) : null}
    </>
  )
}
