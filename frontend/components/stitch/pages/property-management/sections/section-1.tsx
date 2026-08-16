import Link from "next/link"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PropertyStatus } from "@/hooks/use-real-estate-api"
import { cn } from "@/lib/utils"

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
  status: PropertyStatus
  daysOnMarket: number
  predictedSellDays: number
  predictionLabel: string
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
  onViewPropertyClick: (propertyId: number) => void
  searchTerm: string
  statusCards: StatusCard[]
  totalPages: number
  totalResults: number
  visibleAgents: string[]
}

function getStatusClasses(listing: PropertyManagementListing) {
  if (["Closed", "Sold", "Rented"].includes(listing.status)) {
    return "bg-[var(--ether-surface-container-highest)] text-[var(--ether-on-surface-variant)]"
  }

  if (["PendingApproval", "UnderOffer"].includes(listing.status)) {
    return "bg-[var(--ether-error-container)] text-[var(--ether-tertiary)]"
  }

  if (["Draft", "Inactive", "Unpublished"].includes(listing.status)) {
    return "bg-[var(--ether-surface-container-high)] text-[var(--ether-on-surface-variant)]"
  }

  if (listing.daysOnMarket >= 45) {
    return "bg-amber-100 text-amber-700"
  }

  return "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
}

function getStatusLabel(listing: PropertyManagementListing) {
  if (listing.status === "PendingApproval") return "Pending Approval"
  if (listing.status === "UnderOffer") return "Under Contract"
  if (listing.status === "Open") return "Active"
  return listing.status.replace(/([A-Z])/g, " $1").trim()
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
  onViewPropertyClick,
  searchTerm,
  statusCards,
  totalPages,
  totalResults,
  visibleAgents,
}: Section1SectionProps) {
  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <section className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-[var(--ether-on-surface)] sm:text-4xl">
              Property Portfolio
            </h1>
            <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)] sm:text-base">
              Real-time status of your real estate inventory and agent assignments.
            </p>
          </div>

          <Button
            className="h-11 rounded-xl bg-[var(--ether-primary)] px-5 font-bold text-white shadow-[0_10px_25px_rgba(67,67,213,0.22)] hover:bg-[var(--ether-primary-container)]"
            onClick={onAddPropertyClick}
            type="button"
          >
            <AppIcon data-icon="inline-start" name="add_circle" />
            Add Property
          </Button>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((card, index) => {
            const iconClasses = [
              "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]",
              "bg-[color-mix(in_srgb,var(--ether-secondary-container)_28%,white)] text-[var(--ether-secondary)]",
              "bg-[color-mix(in_srgb,var(--ether-tertiary-fixed)_45%,white)] text-[var(--ether-tertiary)]",
              "bg-[var(--ether-surface-container)] text-[var(--ether-on-surface)]",
            ][index] ?? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"

            return (
              <article
                className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)] transition duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-surface-2)]"
                key={card.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className={cn("flex size-12 items-center justify-center rounded-2xl", iconClasses)}>
                    <AppIcon className="text-2xl" name={card.icon} />
                  </span>
                  <span className="rounded-lg bg-[var(--ether-surface-container-low)] px-2.5 py-1 text-[11px] font-bold text-[var(--ether-on-surface-variant)]">
                    {card.detail}
                  </span>
                </div>
                <p className="ether-label-caps mt-5 text-[var(--ether-on-surface-variant)]">{card.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="ether-numeric-lg text-[var(--ether-on-surface)]">{card.value.toLocaleString("en-US")}</p>
                  <span className="text-xs font-medium text-[var(--ether-outline)]">
                    {index === 0 ? "Properties" : index === 1 ? "Live" : index === 2 ? "Finalized" : "Follow-up"}
                  </span>
                </div>
              </article>
            )
          })}
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Property Listings</h2>
              <div className="inline-flex self-start rounded-lg bg-[var(--ether-surface-container-low)] p-1">
                {(["All", "Residential", "Commercial"] as const).map((type) => (
                  <button
                    className={cn(
                      "rounded-md px-3 py-2 text-xs font-bold transition",
                      activeType === type
                        ? "bg-white text-[var(--ether-primary)] shadow-sm"
                        : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]",
                    )}
                    key={type}
                    onClick={() => onTypeChange(type)}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 sm:w-72">
                <AppIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
                <Input
                  className="h-10 rounded-xl border-0 bg-[var(--ether-surface-container-low)] pl-10 shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search properties..."
                  value={searchTerm}
                />
              </div>

              <Select
                modal={false}
                onValueChange={(value) => onFilterChange((value ?? "all") as PropertyManagementFilter)}
                value={activeFilter}
              >
                <SelectTrigger className="h-10 min-w-44 rounded-xl border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none">
                  <SelectValue placeholder="Status: All Listings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Status: All Listings</SelectItem>
                    <SelectItem value="open">Active / Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="long-open">Long Open</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                modal={false}
                onValueChange={(value) => onAgentChange(!value || value === "all-agents" ? "" : value)}
                value={activeAgent || "all-agents"}
              >
                <SelectTrigger className="h-10 min-w-40 rounded-xl border-0 bg-[var(--ether-surface-container-low)] px-4 font-semibold shadow-none">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all-agents">All Agents</SelectItem>
                    {visibleAgents.map((agent) => (
                      <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_62%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_62%,white)]">
                  <TableHead className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Property Details</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Category</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Market Price</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Assigned Agent</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Current Status</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Days Open</TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Forecast</TableHead>
                  <TableHead className="pr-6 text-right ether-label-caps text-[var(--ether-on-surface-variant)]">Quick Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {isLoading ? (
                  <TableRow className="border-0"><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>Loading listings...</EmptyTitle></EmptyHeader></Empty></TableCell></TableRow>
                ) : errorMessage ? (
                  <TableRow className="border-0"><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>{errorMessage}</EmptyTitle></EmptyHeader></Empty></TableCell></TableRow>
                ) : listings.length === 0 ? (
                  <TableRow className="border-0"><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>No listings</EmptyTitle><EmptyDescription>No listings match the current filters.</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>
                ) : (
                  listings.map((listing) => (
                    <TableRow
                      className="group cursor-pointer border-0 transition hover:bg-[color-mix(in_srgb,var(--ether-primary-fixed)_20%,white)]"
                      key={listing.id}
                      onClick={() => onViewPropertyClick(listing.id)}
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="size-14 shrink-0 rounded-xl bg-[var(--ether-surface-container)] bg-cover bg-center shadow-sm transition duration-500 group-hover:scale-105"
                            data-alt={listing.imageAlt}
                            style={{ backgroundImage: `url("${listing.imageSrc}")` }}
                          />
                          <div className="min-w-0">
                            <button
                              className="max-w-[240px] truncate text-left text-sm font-extrabold text-[var(--ether-on-surface)] hover:text-[var(--ether-primary)]"
                              onClick={(event) => {
                                event.stopPropagation()
                                onViewPropertyClick(listing.id)
                              }}
                              type="button"
                            >
                              {listing.addressLine1}
                            </button>
                            <p className="mt-1 max-w-[240px] truncate text-[11px] font-medium text-[var(--ether-outline)]">
                              <AppIcon className="mr-1 inline text-[13px]" name="location_on" />
                              {listing.addressLine2}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="rounded-md bg-[var(--ether-surface-container-low)] px-2.5 py-1 text-xs font-semibold text-[var(--ether-on-surface-variant)]">
                          {listing.propertyType}
                        </span>
                        <p className="mt-2 text-[10px] text-[var(--ether-outline)]">{listing.listingType}</p>
                      </TableCell>

                      <TableCell>
                        <p className="text-sm font-extrabold text-[var(--ether-primary)]">{listing.price}</p>
                        <p className="mt-1 text-[10px] text-[var(--ether-outline)]">Listed Price</p>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-[10px] font-bold text-[var(--ether-primary)]">
                            {listing.agent.split(" ").map((part) => part[0]).slice(0, 2).join("") || "UA"}
                          </span>
                          <span className="max-w-32 text-xs font-bold text-[var(--ether-on-surface)]">{listing.agent}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge className={cn("rounded-full border-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide", getStatusClasses(listing))} variant="secondary">
                          {getStatusLabel(listing)}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-sm text-[var(--ether-on-surface-variant)]">
                        {["Closed", "Inactive", "Sold", "Rented", "Unpublished"].includes(listing.status) ? "—" : `${listing.daysOnMarket} days`}
                      </TableCell>

                      <TableCell>
                        <p className="text-xs font-bold text-[var(--ether-on-surface)]">{listing.predictedSellDays} days</p>
                        <p className="mt-1 text-[10px] text-[var(--ether-outline)]">{listing.predictionLabel}</p>
                      </TableCell>

                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            aria-label="View property details"
                            className="rounded-lg text-[var(--ether-outline)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]"
                            onClick={(event) => {
                              event.stopPropagation()
                              onViewPropertyClick(listing.id)
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <AppIcon name="visibility" />
                          </Button>
                          <Button
                            aria-label="Edit property"
                            className="rounded-lg text-[var(--ether-outline)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]"
                            onClick={(event) => {
                              event.stopPropagation()
                              onEditPropertyClick(listing.id)
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <AppIcon name="edit" />
                          </Button>
                          <Button
                            aria-label="Open public property page"
                            className="rounded-lg text-[var(--ether-outline)] hover:bg-[var(--ether-primary-fixed)] hover:text-[var(--ether-primary)]"
                            onClick={(event) => event.stopPropagation()}
                            render={<Link href={`/properties/${listing.slug}`} />}
                            size="icon-sm"
                            variant="ghost"
                          >
                            <AppIcon name="open_in_new" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--ether-on-surface-variant)]">
              Showing page {currentPage} of {Math.max(totalPages, 1)} · {totalResults.toLocaleString("en-US")} listings
            </p>
            <PagePagination currentPage={currentPage} onPageChange={onPageChange} totalPages={totalPages} />
          </div>
        </section>
      </div>
    </main>
  )
}
