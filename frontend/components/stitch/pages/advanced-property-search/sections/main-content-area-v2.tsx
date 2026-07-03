"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import type { PublicPropertyFilters } from "@/@types/real-estate-api"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useProperties } from "@/hooks/use-real-estate-api"
import { cn } from "@/lib/utils"
import { PropertySearchCard } from "./property-search-card"
import { PropertySearchFilterPanel } from "./property-search-filter-panel"
import {
  parsePositiveInteger,
  parsePriceValue,
  parseSizeValue,
  PROPERTY_PAGE_SIZE,
  type PropertySortMode,
  type PropertyViewMode,
} from "./property-search-helpers"

type MainContentAreaProps = {
  filterOptions: PublicPropertyFilters
}

export function MainContentAreaSplitViewSection({ filterOptions }: MainContentAreaProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [viewMode, setViewMode] = useState<PropertyViewMode>("grid")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  const currentSearch = searchParams.get("search") ?? ""
  const currentListingType =
    searchParams.get("listingType") === "ForRent"
      ? "ForRent"
      : searchParams.get("listingType") === "ForSale"
        ? "ForSale"
        : ""
  const currentPropertyType =
    searchParams.get("propertyType") === "Commercial"
      ? "Commercial"
      : searchParams.get("propertyType") === "Residential"
        ? "Residential"
        : ""
  const currentSort = (searchParams.get("sort") ?? "featured") as PropertySortMode
  const currentPage = parsePositiveInteger(searchParams.get("page"), 1)

  const propertiesQuery = useProperties({
    listingType: currentListingType || undefined,
    page: currentPage,
    pageSize: PROPERTY_PAGE_SIZE,
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
        return items.sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )
    }
  }, [currentSort, propertiesQuery.data?.items])

  function updateUrl(nextValues: {
    listingType?: "" | "ForSale" | "ForRent"
    page?: number
    propertyType?: "" | "Residential" | "Commercial"
    search?: string
    sort?: PropertySortMode
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

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, {
      scroll: false,
    })
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

  const isInitialLoading =
    !propertiesQuery.data && (propertiesQuery.isLoading || propertiesQuery.isFetching)
  const filterPanelKey = searchParams.toString()
  const filterPanel = (
    <PropertySearchFilterPanel
      key={filterPanelKey}
      initialListingType={currentListingType}
      initialPropertyType={currentPropertyType}
      initialSearch={currentSearch}
      listingTypeOptions={[...listingTypes]}
      locations={filterOptions.locations}
      onApply={applyFilters}
      onReset={resetFilters}
      propertyTypeOptions={[...propertyTypes]}
    />
  )

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{"Property search"}</CardTitle>
            <CardDescription>
              {`${propertiesQuery.data?.totalCount ?? 0} open properties matching your criteria`}
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Card className="hidden h-fit lg:block">
            <CardHeader>
              <CardTitle>{"Filters"}</CardTitle>
              <CardDescription>{"Refine the public listing results."}</CardDescription>
            </CardHeader>
            <CardContent>{filterPanel}</CardContent>
          </Card>

          <div className="min-w-0 space-y-4">
            <Card size="sm">
              <CardContent className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                    <SheetTrigger
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-semibold shadow-xs lg:hidden"
                    >
                      <AppIcon name="tune" />
                      {"Filters"}
                    </SheetTrigger>
                    <SheetContent side="left">
                      <SheetHeader>
                        <SheetTitle>{"Search filters"}</SheetTitle>
                      </SheetHeader>
                      <div className="overflow-y-auto px-5 pb-5">{filterPanel}</div>
                    </SheetContent>
                  </Sheet>

                  <div className="flex rounded-xl border bg-background p-1 shadow-xs">
                    <Button
                      aria-label="Grid view"
                      aria-pressed={viewMode === "grid"}
                      onClick={() => setViewMode("grid")}
                      size="icon-sm"
                      type="button"
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                    >
                      <AppIcon name="grid_view" />
                    </Button>
                    <Button
                      aria-label="List view"
                      aria-pressed={viewMode === "list"}
                      onClick={() => setViewMode("list")}
                      size="icon-sm"
                      type="button"
                      variant={viewMode === "list" ? "secondary" : "ghost"}
                    >
                      <AppIcon name="view_list" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="hidden text-sm text-muted-foreground sm:inline">{"Sort by"}</span>
                  <Select
                    modal={false}
                    onValueChange={(value) =>
                      updateUrl({ page: 1, sort: (value ?? "featured") as PropertySortMode })
                    }
                    value={currentSort}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">{"Featured"}</SelectItem>
                      <SelectItem value="price-asc">{"Price: low to high"}</SelectItem>
                      <SelectItem value="price-desc">{"Price: high to low"}</SelectItem>
                      <SelectItem value="latest">{"Date added"}</SelectItem>
                      <SelectItem value="size-desc">{"Size"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {currentSearch || currentListingType || currentPropertyType ? (
              <div className="flex flex-wrap gap-2">
                {currentSearch ? <Badge variant="outline">{`Search: ${currentSearch}`}</Badge> : null}
                {currentListingType ? (
                  <Badge variant="secondary">
                    {currentListingType === "ForRent" ? "For rent" : "For sale"}
                  </Badge>
                ) : null}
                {currentPropertyType ? <Badge variant="outline">{currentPropertyType}</Badge> : null}
                <Button onClick={resetFilters} size="xs" type="button" variant="ghost">
                  {"Clear all"}
                </Button>
              </div>
            ) : null}

            {isInitialLoading ? (
              <Alert>
                <AlertDescription>{"Loading properties..."}</AlertDescription>
              </Alert>
            ) : propertiesQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>{propertiesQuery.error.message}</AlertDescription>
              </Alert>
            ) : displayedProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-card p-12 text-center">
                <p className="font-semibold">{"No matching listings"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {"Try changing the location, category, or listing type filters."}
                </p>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3"
                      : "flex flex-col gap-4",
                  )}
                >
                  {displayedProperties.map((property) => (
                    <PropertySearchCard key={property.id} property={property} viewMode={viewMode} />
                  ))}
                </div>
                <div className="rounded-2xl border bg-card p-3 shadow-sm">
                  <PagePagination
                    currentPage={currentPage}
                    onPageChange={(page) => updateUrl({ page })}
                    totalPages={propertiesQuery.data?.totalPages ?? 1}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
