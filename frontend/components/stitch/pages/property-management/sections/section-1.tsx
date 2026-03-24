import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { cn } from "@/lib/utils"
import { PagePagination } from "@/components/stitch/shared/page-pagination"

export type PropertyManagementFilter = "all" | "open" | "closed" | "long-open"

export type PropertyManagementListing = {
  id: number
  slug: string
  imageSrc: string
  imageAlt: string
  addressLine1: string
  addressLine2: string
  propertyType: "Residential" | "Commercial"
  listingType: "For Sale" | "For Rent"
  price: string
  agent: string
  status: "Open" | "Closed"
  daysOnMarket: number
}

type StatusCard = {
  label: string
  icon: string
  value: number
  detail: string
}

type Section1SectionProps = {
  activeFilter: PropertyManagementFilter
  activeAgent: string
  activeType: "All" | "Residential" | "Commercial"
  currentPage: number
  errorMessage?: string | null
  isLoading: boolean
  listings: PropertyManagementListing[]
  onAddPropertyClick: () => void
  onAgentChange: (agent: string) => void
  onEditPropertyClick: (propertyId: number) => void
  onFilterChange: (filter: PropertyManagementFilter) => void
  onPageChange: (page: number) => void
  onSearchChange: (value: string) => void
  onTypeChange: (type: "All" | "Residential" | "Commercial") => void
  searchTerm: string
  statusCards: StatusCard[]
  totalPages: number
  totalResults: number
  visibleAgents: string[]
}

const quickFilters: Array<{
  id: PropertyManagementFilter
  label: string
  icon: string
}> = [
  {
    id: "all",
    label: "All Listings",
    icon: "domain",
  },
  {
    id: "open",
    label: "Open",
    icon: "verified",
  },
  {
    id: "closed",
    label: "Closed",
    icon: "inventory_2",
  },
  {
    id: "long-open",
    label: "Long Open",
    icon: "trending_up",
  },
]

function getStatusClasses(listing: PropertyManagementListing) {
  if (listing.status === "Closed") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  if (listing.daysOnMarket >= 45) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
  }

  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
}

function getStatusLabel(listing: PropertyManagementListing) {
  if (listing.status === "Closed") {
    return "Closed"
  }

  if (listing.daysOnMarket >= 45) {
    return "Long Open"
  }

  return "Open"
}

export function Section1Section({
  activeFilter,
  activeAgent,
  activeType,
  currentPage,
  errorMessage,
  isLoading,
  listings,
  onAddPropertyClick,
  onAgentChange,
  onEditPropertyClick,
  onFilterChange,
  onPageChange,
  onSearchChange,
  onTypeChange,
  searchTerm,
  statusCards,
  totalPages,
  totalResults,
  visibleAgents,
}: Section1SectionProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-secondary">
              {"Admin Workspace"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {"Property Management"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {"Track every listing, identify long-open inventory, and launch a new property only when you need it."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-[260px]">
              <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" name="search" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-800"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search listings, cities, or agents"
                type="text"
                value={searchTerm}
              />
            </label>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
              onClick={onAddPropertyClick}
              type="button"
            >
              <AppIcon className="text-lg" name="add" />
              {"Add Property"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    {card.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {card.value}
                  </p>
                </div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <AppIcon className="text-2xl" name={card.icon} />
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {card.detail}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {quickFilters.map((filter) => (
                <button
                  key={filter.id}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                    activeFilter === filter.id
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                  onClick={() => onFilterChange(filter.id)}
                  type="button"
                >
                  <AppIcon className="text-base" name={filter.icon} />
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800"
                onChange={(event) => onTypeChange(event.target.value as "All" | "Residential" | "Commercial")}
                value={activeType}
              >
                <option value="All">{"All Types"}</option>
                <option value="Residential">{"Residential"}</option>
                <option value="Commercial">{"Commercial"}</option>
              </select>
              <select
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-800"
                onChange={(event) => onAgentChange(event.target.value)}
                value={activeAgent}
              >
                <option value="">{"All Agents"}</option>
                {visibleAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Your Listings"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {`${totalResults} total result${totalResults === 1 ? "" : "s"} across ${totalPages} page${totalPages === 1 ? "" : "s"}`}
              </p>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              {`Page ${currentPage} of ${Math.max(totalPages, 1)}`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Listing"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Type"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Price"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Agent"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Status"}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Days Open"}
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {"Actions"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400" colSpan={7}>
                      {"Loading listings..."}
                    </td>
                  </tr>
                ) : errorMessage ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-rose-600" colSpan={7}>
                      {errorMessage}
                    </td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400" colSpan={7}>
                      {"No listings match the current filters."}
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr
                      key={listing.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/20"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-14 w-20 rounded-xl bg-cover bg-center"
                            data-alt={listing.imageAlt}
                            style={{ backgroundImage: `url("${listing.imageSrc}")` }}
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {listing.addressLine1}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {listing.addressLine2}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {listing.propertyType}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {listing.listingType}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-primary">
                        {listing.price}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                        {listing.agent}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                            getStatusClasses(listing),
                          )}
                        >
                          {getStatusLabel(listing)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {listing.status === "Closed" ? "-" : `${listing.daysOnMarket} days`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                            onClick={() => onEditPropertyClick(listing.id)}
                            type="button"
                          >
                            <AppIcon name="edit" />
                          </button>
                          <Link
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                            href={`/properties/${listing.slug}`}
                          >
                            <AppIcon name="visibility" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
            <PagePagination currentPage={currentPage} onPageChange={onPageChange} totalPages={totalPages} />
          </div>
        </section>
      </main>
    </div>
  )
}
