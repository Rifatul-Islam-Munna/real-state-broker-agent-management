"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { formatPriceLabel } from "@/lib/currency"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type PropertyItem, useProperties } from "@/hooks/use-real-estate-api"
import type { PublicPropertyFilters } from "@/types/real-estate-api"
import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/ui/app-icon"

type MainContentAreaSplitViewSectionProps = {
  filterOptions: PublicPropertyFilters
}

type ViewMode = "grid" | "list"
type SortMode = "featured" | "price-asc" | "price-desc" | "latest" | "size-desc"

const PAGE_SIZE = 12
const propertyCardIcons = ["bed", "bathtub", "square_foot"] as const
const fallbackImage = "https://placehold.co/1200x800/e2e8f0/0f172a?text=EstateBlue"

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parsePriceValue(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseSizeValue(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "")
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function listingTypeLabel(value: "ForSale" | "ForRent") {
  return value === "ForRent" ? "FOR RENT" : "FOR SALE"
}

function propertyTypeLabel(value: "Residential" | "Commercial") {
  return value === "Commercial" ? "Commercial" : "Residential"
}

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? fallbackImage
}

function listingSpecs(property: PropertyItem) {
  return [
    property.bedRoom ? `${property.bedRoom} Beds` : "Beds N/A",
    property.bathRoom ? `${property.bathRoom} Baths` : "Baths N/A",
    property.width ? property.width : "Size N/A",
  ] as const
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function PropertyCardItem({
  property,
  viewMode,
}: {
  property: PropertyItem
  viewMode: ViewMode
}) {
  const isListView = viewMode === "list"

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        isListView && "sm:flex",
      )}
    >
      <Link href={`/properties/${property.slug}`} className={cn("block h-full", isListView && "sm:flex sm:w-full")}>
        <div
          className={cn(
            "relative overflow-hidden bg-slate-200 dark:bg-slate-800",
            isListView ? "h-56 sm:h-auto sm:min-h-56 sm:w-72 sm:shrink-0" : "h-48 w-full",
          )}
        >
          <img
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={listingImage(property)}
          />
          <span className="absolute left-3 top-3 rounded bg-primary px-2 py-1 text-xs font-bold text-white">
            {listingTypeLabel(property.listingType)}
          </span>
        </div>
        <div
          className={cn(
            "p-4",
            isListView && "flex flex-col justify-between gap-4 sm:flex-1 sm:p-6",
          )}
        >
          <div>
            <div className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
              {formatPriceLabel(property.price)}
            </div>
            <div className="mb-2 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
              <AppIcon className="text-sm" name="location_on" />
              <span className={cn(!isListView && "truncate")}>
                {property.location || property.exactLocation}
              </span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {propertyTypeLabel(property.propertyType)}
            </p>
          </div>
          <div
            className={cn(
              "border-t border-slate-100 pt-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300",
              isListView ? "grid grid-cols-1 gap-2 sm:grid-cols-3" : "flex items-center justify-between",
            )}
          >
            {listingSpecs(property).map((spec, index) => (
              <div key={`${property.id}-${spec}`} className="flex items-center gap-1">
                <AppIcon className="text-base text-slate-400" name={propertyCardIcons[index] ?? "square_foot"} />
                {spec}
              </div>
            ))}
          </div>
        </div>
      </Link>
    </article>
  )
}

type FilterPanelProps = {
  initialListingType: "" | "ForSale" | "ForRent"
  initialPropertyType: "" | "Residential" | "Commercial"
  initialSearch: string
  listingTypeOptions: Array<"ForSale" | "ForRent">
  locations: string[]
  onApply: (values: {
    listingType: "" | "ForSale" | "ForRent"
    propertyType: "" | "Residential" | "Commercial"
    search: string
  }) => void
  onReset: () => void
  propertyTypeOptions: Array<"Residential" | "Commercial">
}

function FilterPanel({
  initialListingType,
  initialPropertyType,
  initialSearch,
  listingTypeOptions,
  locations,
  onApply,
  onReset,
  propertyTypeOptions,
}: FilterPanelProps) {
  const [draftSearch, setDraftSearch] = useState(initialSearch)
  const [draftListingType, setDraftListingType] = useState(initialListingType)
  const [draftPropertyType, setDraftPropertyType] = useState(initialPropertyType)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Search"}
        </h3>
        <div className="flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
          <AppIcon className="mr-2 text-slate-400" name="search" />
          <Input
            className="h-auto border-none bg-transparent px-0 py-0 text-sm text-slate-900 shadow-none focus-visible:ring-0 dark:text-white"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="City, neighborhood, ZIP, or title"
            type="text"
            value={draftSearch}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Listing Type"}
        </h3>
        <Select
          modal={false}
          onValueChange={(value) =>
            setDraftListingType(!value || value === "all" ? "" : (value as "ForSale" | "ForRent"))
          }
          value={draftListingType || "all"}
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <SelectValue placeholder="All Listings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {"All Listings"}
            </SelectItem>
            {listingTypeOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "ForRent" ? "For Rent" : "For Sale"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Property Category"}
        </h3>
        <Select
          modal={false}
          onValueChange={(value) =>
            setDraftPropertyType(
              !value || value === "all" ? "" : (value as "Residential" | "Commercial"),
            )
          }
          value={draftPropertyType || "all"}
        >
          <SelectTrigger className="h-10 w-full rounded-lg border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {"All Categories"}
            </SelectItem>
            {propertyTypeOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {propertyTypeLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Popular Markets"}
        </h3>
        {locations.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {"Locations will appear here once public properties are added."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <button
                key={location}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
                onClick={() => setDraftSearch(location)}
                type="button"
              >
                {location}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
          onClick={() =>
            onApply({
              listingType: draftListingType,
              propertyType: draftPropertyType,
              search: draftSearch,
            })}
          type="button"
        >
          {"Apply Filters"}
        </button>
        <button
          className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={onReset}
          type="button"
        >
          {"Reset"}
        </button>
      </div>
    </div>
  )
}

export function MainContentAreaSplitViewSection({ filterOptions }: MainContentAreaSplitViewSectionProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const currentSearch = searchParams.get("search") ?? ""
  const currentListingType = searchParams.get("listingType") === "ForRent"
    ? "ForRent"
    : searchParams.get("listingType") === "ForSale"
      ? "ForSale"
      : ""
  const currentPropertyType = searchParams.get("propertyType") === "Commercial"
    ? "Commercial"
    : searchParams.get("propertyType") === "Residential"
      ? "Residential"
      : ""
  const currentSort = (searchParams.get("sort") ?? "featured") as SortMode
  const currentPage = parsePositiveInteger(searchParams.get("page"), 1)

  const propertiesQuery = useProperties({
    listingType: currentListingType || undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
    propertyType: currentPropertyType || undefined,
    search: currentSearch || undefined,
    status: "Open",
  })

  const listingTypes = useMemo(
    () =>
      filterOptions.listingTypes.length > 0
        ? filterOptions.listingTypes
        : (["ForSale", "ForRent"] as const),
    [filterOptions.listingTypes],
  )
  const propertyTypes = useMemo(
    () =>
      filterOptions.propertyTypes.length > 0
        ? filterOptions.propertyTypes
        : (["Residential", "Commercial"] as const),
    [filterOptions.propertyTypes],
  )

  const displayedProperties = useMemo(() => {
    const items = [...(propertiesQuery.data?.items ?? [])]

    switch (currentSort) {
      case "price-asc":
        return items.sort((left, right) => parsePriceValue(left.price) - parsePriceValue(right.price))
      case "price-desc":
        return items.sort((left, right) => parsePriceValue(right.price) - parsePriceValue(left.price))
      case "latest":
        return items.sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )
      case "size-desc":
        return items.sort((left, right) => parseSizeValue(right.width) - parseSizeValue(left.width))
      default:
        return items.sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    }
  }, [currentSort, propertiesQuery.data?.items])

  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, propertiesQuery.data?.totalPages ?? 1),
    [currentPage, propertiesQuery.data?.totalPages],
  )

  function updateUrl(nextValues: {
    listingType?: "" | "ForSale" | "ForRent"
    page?: number
    propertyType?: "" | "Residential" | "Commercial"
    search?: string
    sort?: SortMode
  }) {
    const params = new URLSearchParams(searchParams.toString())

    const search = nextValues.search ?? currentSearch
    const listingType = nextValues.listingType ?? currentListingType
    const propertyType = nextValues.propertyType ?? currentPropertyType
    const page = nextValues.page ?? currentPage
    const sort = nextValues.sort ?? currentSort

    if (search) params.set("search", search)
    else params.delete("search")

    if (listingType) params.set("listingType", listingType)
    else params.delete("listingType")

    if (propertyType) params.set("propertyType", propertyType)
    else params.delete("propertyType")

    if (sort && sort !== "featured") params.set("sort", sort)
    else params.delete("sort")

    if (page > 1) params.set("page", String(page))
    else params.delete("page")

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false })
  }

  function applyFilters(values: {
    listingType: "" | "ForSale" | "ForRent"
    propertyType: "" | "Residential" | "Commercial"
    search: string
  }) {
    updateUrl({
      listingType: values.listingType,
      page: 1,
      propertyType: values.propertyType,
      search: values.search.trim(),
    })
    setIsFilterSheetOpen(false)
  }

  function resetFilters() {
    router.push(pathname, { scroll: false })
    setIsFilterSheetOpen(false)
  }

  const isInitialLoading = !propertiesQuery.data && (propertiesQuery.isLoading || propertiesQuery.isFetching)
  const filterPanelKey = searchParams.toString()

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="shrink-0 border-b border-slate-200 p-6 pb-4 dark:border-slate-800">
          <h1 className="text-2xl font-bold leading-tight tracking-light text-slate-900 dark:text-white">
            {"Property Search"}
          </h1>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
            {`${propertiesQuery.data?.totalCount ?? 0} open properties matching your criteria`}
          </p>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 md:block">
            <FilterPanel
              key={`desktop-${filterPanelKey}`}
              initialListingType={currentListingType}
              initialPropertyType={currentPropertyType}
              initialSearch={currentSearch}
              listingTypeOptions={[...listingTypes]}
              locations={filterOptions.locations}
              onApply={({ listingType, propertyType, search }) =>
                applyFilters({ listingType, propertyType, search })
              }
              onReset={resetFilters}
              propertyTypeOptions={[...propertyTypes]}
            />
          </aside>
          <div className="flex-1 overflow-y-auto bg-background-light p-4 dark:bg-background-dark">
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden">
                    <AppIcon className="text-lg" name="tune" />
                    {"Filters"}
                  </SheetTrigger>
                  <SheetContent
                    className="w-[min(24rem,92vw)] border-r border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950"
                    showCloseButton={false}
                    side="left"
                  >
                    <SheetHeader className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                      <SheetTitle className="text-left text-base font-bold text-slate-900 dark:text-white">
                        {"Search Filters"}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="overflow-y-auto px-5 py-5">
                      <FilterPanel
                        key={`mobile-${filterPanelKey}`}
                        initialListingType={currentListingType}
                        initialPropertyType={currentPropertyType}
                        initialSearch={currentSearch}
                        listingTypeOptions={[...listingTypes]}
                        locations={filterOptions.locations}
                        onApply={({ listingType, propertyType, search }) =>
                          applyFilters({ listingType, propertyType, search })
                        }
                        onReset={resetFilters}
                        propertyTypeOptions={[...propertyTypes]}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="flex gap-1">
                  <button
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={cn(
                      "rounded p-1.5 transition-colors",
                      viewMode === "grid"
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                    onClick={() => setViewMode("grid")}
                    type="button"
                  >
                    <AppIcon className="text-xl" name="grid_view" />
                  </button>
                  <button
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "rounded p-1.5 transition-colors",
                      viewMode === "list"
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                    )}
                    onClick={() => setViewMode("list")}
                    type="button"
                  >
                    <AppIcon className="text-xl" name="view_list" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
                  {"Sort by:"}
                </span>
                <Select
                  modal={false}
                  onValueChange={(value) => updateUrl({ page: 1, sort: (value ?? "featured") as SortMode })}
                  value={currentSort}
                >
                  <SelectTrigger className="h-auto min-w-40 border-none bg-transparent px-0 py-0 text-sm font-medium text-slate-900 shadow-none focus-visible:ring-0 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">
                      {"Featured"}
                    </SelectItem>
                    <SelectItem value="price-asc">
                      {"Price: Low to High"}
                    </SelectItem>
                    <SelectItem value="price-desc">
                      {"Price: High to Low"}
                    </SelectItem>
                    <SelectItem value="latest">
                      {"Date Added"}
                    </SelectItem>
                    <SelectItem value="size-desc">
                      {"Size"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {currentSearch ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {`Search: ${currentSearch}`}
                </span>
              ) : null}
              {currentListingType ? (
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
                  {currentListingType === "ForRent" ? "For Rent" : "For Sale"}
                </span>
              ) : null}
              {currentPropertyType ? (
                <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {currentPropertyType}
                </span>
              ) : null}
            </div>

            {isInitialLoading ? (
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  {"Loading Properties"}
                </p>
              </div>
            ) : displayedProperties.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                  {"No Matching Listings"}
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {"Try changing the location, category, or listing type filters."}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "flex flex-col gap-4",
                  )}
                >
                  {displayedProperties.map((property) => (
                    <PropertyCardItem
                      key={property.id}
                      property={property}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                <div className="mb-4 mt-8 flex justify-center">
                  <nav className="flex gap-1">
                    <button
                      className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      disabled={currentPage <= 1}
                      onClick={() => updateUrl({ page: currentPage - 1 })}
                      type="button"
                    >
                      {"Prev"}
                    </button>
                    {pageNumbers.map((pageNumber) => (
                      <button
                        key={pageNumber}
                        className={cn(
                          "rounded px-3 py-1",
                          pageNumber === currentPage
                            ? "bg-primary text-white"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                        )}
                        onClick={() => updateUrl({ page: pageNumber })}
                        type="button"
                      >
                        {pageNumber}
                      </button>
                    ))}
                    <button
                      className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      disabled={currentPage >= (propertiesQuery.data?.totalPages ?? 1)}
                      onClick={() => updateUrl({ page: currentPage + 1 })}
                      type="button"
                    >
                      {"Next"}
                    </button>
                  </nav>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
