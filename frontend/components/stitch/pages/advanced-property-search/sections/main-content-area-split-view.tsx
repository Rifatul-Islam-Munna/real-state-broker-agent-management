"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { useState } from "react"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { publicPropertyDetailPageMeta } from "@/static-data/pages/public-property-detail/meta"

type PropertyCard = {
  status: string
  statusClassName: string
  price: string
  priceSuffix?: string
  location: string
  imageAlt: string
  imageDataAlt?: string
  imageSrc: string
  specs: [string, string, string]
  favorited?: boolean
  dimmed?: boolean
}

type ViewMode = "grid" | "list"

const propertyCards: PropertyCard[] = [
  {
    status: "FOR SALE",
    statusClassName: "bg-primary",
    price: "$1,250,000",
    location: "1234 Elm Street, Beverly Hills, CA",
    imageAlt: "Modern house exterior with pool",
    imageDataAlt: "Modern house with pool",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC8D18z6U40oLkhwMBjJ72v1hz1trxb7xtBIDAjpDMCKdaPo7I3nHehMTY_agXqi5E0l0zVISyEROSt4UiyFhMZfZTqLFM3oIXAOuM6lzxtVUMoGKdmwOBKX3wgMe9zXdTwWhuFZ1ejTjhQjUd-syWTVAn2TbiAjBOnjJrsxoEq8GGzEbyn8SVXLgS4WRDLlrNSBrxw8h0jMI-XJRScUbtI0F7KjHMcUGXjUsBst9maSQpEtNxznU1h0YdmI0icXWTJ1wGafb3T1n8",
    specs: ["4 Beds", "3 Baths", "2,800 sqft"],
  },
  {
    status: "FOR RENT",
    statusClassName: "bg-primary",
    price: "$4,500",
    priceSuffix: "/mo",
    location: "88 Downtown Ave, Seattle, WA",
    imageAlt: "Luxury apartment interior",
    imageDataAlt: "Luxury apartment interior",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuC15HyKu2ju1EzbR9-JV72-tF7NtXjIbCrDCkFN4RJnqjg4l8W8uhkqhoud5PARWtf034IuH4wTbhL9mvNBsaXgD01LAoORRjkScsY2VOeV4T_b7cMKWLQvEYLFIg2ienfbYveZdVBHKJT1j19JeRXW8i5dCF8m2_o7LvrH4ZcfbI1j6liOytMXVx17LWVhYZ1yh74g9wUFBsi7bfPGk7nUx1ReJkgX8f5oKuVdLU0NA8DDgVut8EWeXV8E5TAl3xSJC7r_j3OMRrc",
    specs: ["2 Beds", "2 Baths", "1,200 sqft"],
  },
  {
    status: "FOR SALE",
    statusClassName: "bg-primary",
    price: "$850,000",
    location: "45 Oak Lane, Austin, TX",
    imageAlt: "Suburban family house",
    imageDataAlt: "Suburban family house",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDuxFTPeLBrSkrgJm2Ii_uXg2q1drjeQw_mFTXODERtWIvo9JZJnR40Ropf4NU3pSGogO-650aH-uyKH08b0pQEyE_u76rE0nnFQcrxIEw4qvbEb0zMGUrAlnyl_B0980iOLiP_DnvCAgUpLNXsYojfR5XPAKcg15XzGponzfv16KtWKpEnkDJ3SPh1u7eKgHd7nP-4kWnrUIxrUqjUppY_lQK2kdd6YWxZEaOxMLEyNaFFyQuk9sOJa9ortSns-wkRe_wdX2c49qw",
    specs: ["3 Beds", "2.5 Baths", "2,100 sqft"],
  },
  {
    status: "SOLD",
    statusClassName: "bg-slate-700",
    price: "$520,000",
    location: "12 Marina Blvd, Miami, FL",
    imageAlt: "Modern condo building",
    imageDataAlt: "Modern condo building",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBwD7EaqJPaRK2uGo4zE41Yjd-7Zv7ZTKLIaMrBO_NtPdsknkgw5kGTitG157P6-ak7ohUQSUG1pY3ZA_GtOBHi5OoPy2OVdt_PXH3Drwz-fyTZWZL8M_0GXcIGiQWCPV70lzrxXAqpledoku7EvQ0qp6568noBVunBS18U8r0pOeJkFTsIQqHiskTLWglwMCA-DvfWqORG_KwwSInEPjk_QE7MU2jR0QZF8rDI986Lk3_b9kKDSj_sXlVzIuKKAxa6TDzjcf6tkqA",
    specs: ["1 Bed", "1 Bath", "850 sqft"],
    favorited: true,
    dimmed: true,
  },
  {
    status: "FOR SALE",
    statusClassName: "bg-primary",
    price: "$980,000",
    location: "567 Pine Road, Portland, OR",
    imageAlt: "Modern house exterior",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCHX-V7S5k-9Z8v7oXk6r0x9k7y7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z7z",
    specs: ["4 Beds", "3 Baths", "2,400 sqft"],
  },
  {
    status: "FOR RENT",
    statusClassName: "bg-primary",
    price: "$3,200",
    priceSuffix: "/mo",
    location: "101 Skyline Dr, Denver, CO",
    imageAlt: "City apartment",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD9e8r7t6y5u4i3o2p1l0k9j8h7g6f5d4s3a2z1x0c9v8b7n6m5l4k3j2h1g0",
    specs: ["1 Bed", "1 Bath", "900 sqft"],
  },
]

const propertyCardIcons = ["bed", "bathtub", "square_foot"] as const

function FilterPanel({ onApply }: { onApply?: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Location"}
        </h3>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          placeholder="City, Neighborhood, ZIP"
          type="text"
        />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Status"}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"For Sale"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"For Rent"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Sold"}
            </span>
          </label>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Property Type"}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"House"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Apartment"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Condo"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Land"}
            </span>
          </label>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Price Range"}
        </h3>
        <div className="flex items-center gap-2">
          <input
            className="w-1/2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="Min"
            type="text"
          />
          <span className="text-slate-500">
            {"-"}
          </span>
          <input
            className="w-1/2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="Max"
            type="text"
          />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Beds & Baths"}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <select className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>
              {"Beds (Any)"}
            </option>
            <option>
              {"1+"}
            </option>
            <option>
              {"2+"}
            </option>
            <option>
              {"3+"}
            </option>
            <option>
              {"4+"}
            </option>
          </select>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            <option>
              {"Baths (Any)"}
            </option>
            <option>
              {"1+"}
            </option>
            <option>
              {"2+"}
            </option>
            <option>
              {"3+"}
            </option>
          </select>
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {"Features"}
        </h3>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Pool"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Garage"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Garden"}
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              type="checkbox"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {"Elevator"}
            </span>
          </label>
        </div>
      </div>
      <button
        className="w-full rounded-lg bg-primary py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
        onClick={onApply}
        type="button"
      >
        {"Apply Filters"}
      </button>
    </div>
  )
}

function PropertyCardItem({
  property,
  viewMode,
}: {
  property: PropertyCard
  viewMode: ViewMode
}) {
  const isListView = viewMode === "list"

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        isListView && "sm:flex",
      )}
    >
      <button
        aria-label="Save property"
        className={cn(
          "absolute right-3 top-3 z-10 rounded-full p-2 transition-colors",
          property.favorited
            ? "bg-white/80 text-primary hover:bg-primary/10 dark:bg-slate-900/80"
            : "bg-white/80 text-slate-500 hover:bg-primary/10 hover:text-primary dark:bg-slate-900/80",
        )}
        type="button"
      >
        <span className="material-symbols-outlined text-lg">
          {property.favorited ? "favorite" : "favorite_border"}
        </span>
      </button>
      <Link href={publicPropertyDetailPageMeta.routePath} className={cn("block h-full", isListView && "sm:flex sm:w-full")}>
        <div
          className={cn(
            "relative overflow-hidden bg-slate-200 dark:bg-slate-800",
            isListView ? "h-56 sm:h-auto sm:min-h-56 sm:w-72 sm:shrink-0" : "h-48 w-full",
          )}
        >
          <img
            alt={property.imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-alt={property.imageDataAlt}
            src={property.imageSrc}
          />
          <span
            className={cn(
              "absolute left-3 top-3 rounded px-2 py-1 text-xs font-bold text-white",
              property.statusClassName,
            )}
          >
            {property.status}
          </span>
        </div>
        <div
          className={cn(
            "p-4",
            property.dimmed && "opacity-75",
            isListView && "flex flex-col justify-between gap-4 sm:flex-1 sm:p-6",
          )}
        >
          <div>
            <div className="mb-1 text-xl font-bold text-slate-900 dark:text-white">
              {property.price}
              {property.priceSuffix ? (
                <span className="text-sm font-normal text-slate-500">
                  {property.priceSuffix}
                </span>
              ) : null}
            </div>
            <div className={cn("mb-3 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400", !isListView && "truncate")}>
              <span className="material-symbols-outlined text-sm">
                {"location_on"}
              </span>
              {property.location}
            </div>
          </div>
          <div
            className={cn(
              "border-t border-slate-100 pt-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300",
              isListView ? "grid grid-cols-1 gap-2 sm:grid-cols-3" : "flex items-center justify-between",
            )}
          >
            {property.specs.map((spec, index) => (
              <div key={spec} className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base text-slate-400">
                  {propertyCardIcons[index] ?? "square_foot"}
                </span>
                {spec}
              </div>
            ))}
          </div>
        </div>
      </Link>
    </article>
  )
}

export function MainContentAreaSplitViewSection() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="shrink-0 border-b border-slate-200 p-6 pb-4 dark:border-slate-800">
          <h1 className="text-2xl font-bold leading-tight tracking-light text-slate-900 dark:text-white">
            {"Property Search"}
          </h1>
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400">
            {"Showing 142 properties matching your criteria"}
          </p>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 md:block">
            <FilterPanel />
          </aside>
          <div className="flex-1 overflow-y-auto bg-background-light p-4 dark:bg-background-dark">
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                  <SheetTrigger className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 md:hidden">
                    <span className="material-symbols-outlined text-lg">
                      {"tune"}
                    </span>
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
                      <FilterPanel onApply={() => setIsFilterSheetOpen(false)} />
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
                    <span className="material-symbols-outlined text-xl">
                      {"grid_view"}
                    </span>
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
                    <span className="material-symbols-outlined text-xl">
                      {"view_list"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
                  {"Sort by:"}
                </span>
                <select className="cursor-pointer border-none bg-transparent pl-0 text-sm font-medium text-slate-900 focus:ring-0 dark:text-white">
                  <option>
                    {"Featured"}
                  </option>
                  <option>
                    {"Price: Low to High"}
                  </option>
                  <option>
                    {"Price: High to Low"}
                  </option>
                  <option>
                    {"Date Added"}
                  </option>
                  <option>
                    {"Size"}
                  </option>
                </select>
              </div>
            </div>
            <div
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "flex flex-col gap-4",
              )}
            >
              {propertyCards.map((property) => (
                <PropertyCardItem
                  key={`${property.status}-${property.location}`}
                  property={property}
                  viewMode={viewMode}
                />
              ))}
            </div>
            <div className="mb-4 mt-8 flex justify-center">
              <nav className="flex gap-1">
                <button className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" type="button">
                  {"Prev"}
                </button>
                <button className="rounded bg-primary px-3 py-1 text-white" type="button">
                  {"1"}
                </button>
                <button className="rounded border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" type="button">
                  {"2"}
                </button>
                <button className="rounded border border-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" type="button">
                  {"3"}
                </button>
                <span className="px-2 py-1 text-slate-500">
                  {"..."}
                </span>
                <button className="rounded border border-slate-200 px-3 py-1 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800" type="button">
                  {"Next"}
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
