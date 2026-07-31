"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { FormEvent, useMemo, useState } from "react"

import type { PublicPropertyFilters } from "@/@types/real-estate-api"
import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useProperties } from "@/hooks/use-real-estate-api"
import { PropertySearchCard } from "./property-search-card"
import {
  parsePositiveInteger,
  parsePriceValue,
  parseSizeValue,
  PROPERTY_PAGE_SIZE,
  type PropertySortMode,
} from "./property-search-helpers"

type MainContentAreaProps = {
  filterOptions: PublicPropertyFilters
}

export function MainContentAreaSplitViewSection({ filterOptions }: MainContentAreaProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSearch = searchParams.get("search") ?? ""
  const currentListingType = searchParams.get("listingType") === "ForRent" ? "ForRent" : searchParams.get("listingType") === "ForSale" ? "ForSale" : ""
  const currentPropertyType = searchParams.get("propertyType") === "Commercial" ? "Commercial" : searchParams.get("propertyType") === "Residential" ? "Residential" : ""
  const currentSort = (searchParams.get("sort") ?? "featured") as PropertySortMode
  const currentPage = parsePositiveInteger(searchParams.get("page"), 1)

  const [searchValue, setSearchValue] = useState(currentSearch)
  const [propertyTypeValue, setPropertyTypeValue] = useState(currentPropertyType)
  const [listingTypeValue, setListingTypeValue] = useState(currentListingType)

  const propertiesQuery = useProperties({
    listingType: currentListingType || undefined,
    page: currentPage,
    pageSize: PROPERTY_PAGE_SIZE,
    propertyType: currentPropertyType || undefined,
    search: currentSearch || undefined,
    status: "Open",
  })

  const displayedProperties = useMemo(() => {
    const items = [...(propertiesQuery.data?.items ?? [])]
    switch (currentSort) {
      case "price-asc": return items.sort((a, b) => parsePriceValue(a.price) - parsePriceValue(b.price))
      case "price-desc": return items.sort((a, b) => parsePriceValue(b.price) - parsePriceValue(a.price))
      case "latest": return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      case "size-desc": return items.sort((a, b) => parseSizeValue(b.width) - parseSizeValue(a.width))
      default: return items
    }
  }, [currentSort, propertiesQuery.data?.items])

  function updateUrl(next: { search?: string; listingType?: "" | "ForSale" | "ForRent"; propertyType?: "" | "Residential" | "Commercial"; sort?: PropertySortMode; page?: number }) {
    const params = new URLSearchParams(searchParams.toString())
    const values = {
      search: next.search ?? currentSearch,
      listingType: next.listingType ?? currentListingType,
      propertyType: next.propertyType ?? currentPropertyType,
      sort: next.sort ?? currentSort,
      page: next.page ?? currentPage,
    }

    if (values.search) params.set("search", values.search); else params.delete("search")
    if (values.listingType) params.set("listingType", values.listingType); else params.delete("listingType")
    if (values.propertyType) params.set("propertyType", values.propertyType); else params.delete("propertyType")
    if (values.sort !== "featured") params.set("sort", values.sort); else params.delete("sort")
    if (values.page > 1) params.set("page", String(values.page)); else params.delete("page")

    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false })
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    updateUrl({ search: searchValue.trim(), propertyType: propertyTypeValue, listingType: listingTypeValue, page: 1 })
  }

  const isInitialLoading = !propertiesQuery.data && (propertiesQuery.isLoading || propertiesQuery.isFetching)
  const totalCount = propertiesQuery.data?.totalCount ?? 0
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * PROPERTY_PAGE_SIZE + 1
  const endItem = Math.min(currentPage * PROPERTY_PAGE_SIZE, totalCount)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f7f8ff] px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-[1180px]">
        <section className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-[-0.035em] text-[#0b1c30] sm:text-5xl">Explore Premium Listings</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#5b6070]">Curated real estate opportunities for high-performance portfolios. Precision data meets architectural excellence.</p>
        </section>

        <form onSubmit={submitSearch} className="mt-8 flex flex-col gap-3 rounded-[24px] bg-white p-4 shadow-[0_12px_35px_rgba(67,67,213,.06)] lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#eff2ff] px-4 py-3.5">
            <AppIcon className="text-xl text-[#4343d5]" name="location_on" />
            <input value={searchValue} onChange={(event) => setSearchValue(event.target.value)} placeholder="Enter city, neighborhood, or ZIP" className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="hidden h-10 w-px bg-slate-200 lg:block" />
          <Select value={propertyTypeValue || "all"} onValueChange={(value) => setPropertyTypeValue(value === "all" ? "" : value as "Residential" | "Commercial")}>
            <SelectTrigger className="h-12 border-0 bg-transparent lg:w-44"><SelectValue placeholder="Property Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All property types</SelectItem>
              {filterOptions.propertyTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={listingTypeValue || "all"} onValueChange={(value) => setListingTypeValue(value === "all" ? "" : value as "ForSale" | "ForRent")}>
            <SelectTrigger className="h-12 border-0 bg-transparent lg:w-40"><SelectValue placeholder="Listing Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Sale or rent</SelectItem>
              <SelectItem value="ForSale">For sale</SelectItem>
              <SelectItem value="ForRent">For rent</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="h-12 rounded-xl bg-[#4343d5] px-8 text-sm font-bold hover:bg-[#3434b8]">Search Now</Button>
        </form>

        <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {[
              ["", "All Properties"],
              ["Commercial", "Commercial"],
              ["Residential", "Residential"],
            ].map(([value, label]) => {
              const active = currentPropertyType === value
              return <button key={label} onClick={() => updateUrl({ propertyType: value as "" | "Residential" | "Commercial", page: 1 })} className={`whitespace-nowrap rounded-full border px-5 py-2 text-sm font-semibold transition ${active ? "border-[#4343d5] bg-[#d8d8ff] text-[#3434c7]" : "border-[#c7c4d7] bg-white text-[#464555] hover:border-[#4343d5]"}`}>{label}</button>
            })}
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Sort by:</span>
            <Select value={currentSort} onValueChange={(value) => updateUrl({ sort: value as PropertySortMode, page: 1 })}>
              <SelectTrigger className="w-48 border-0 bg-transparent font-semibold text-[#4343d5]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured First</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="latest">Newest Listings</SelectItem>
                <SelectItem value="size-desc">Largest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6">
          {isInitialLoading ? (
            <Alert><AlertDescription>Loading properties...</AlertDescription></Alert>
          ) : propertiesQuery.error ? (
            <Alert variant="destructive"><AlertDescription>{propertiesQuery.error.message}</AlertDescription></Alert>
          ) : displayedProperties.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-white p-14 text-center"><p className="font-semibold">No matching listings</p><p className="mt-2 text-sm text-slate-500">Try another location or property category.</p></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {displayedProperties.map((property) => <PropertySearchCard key={property.id} property={property} viewMode="grid" />)}
            </div>
          )}
        </div>

        {totalCount > 0 ? (
          <div className="mt-12 flex flex-col items-center justify-between gap-5 sm:flex-row">
            <p className="text-sm text-slate-500">Showing {startItem}-{endItem} of {totalCount} properties</p>
            <PagePagination currentPage={currentPage} onPageChange={(page) => updateUrl({ page })} totalPages={propertiesQuery.data?.totalPages ?? 1} />
          </div>
        ) : null}
      </div>
    </main>
  )
}
