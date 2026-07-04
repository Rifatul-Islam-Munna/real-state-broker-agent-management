import Link from "next/link"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
  if (listing.status === "Closed" || listing.status === "Sold" || listing.status === "Rented") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  }

  if (listing.status === "PendingApproval") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
  }

  if (listing.status === "Draft" || listing.status === "Unpublished") {
    return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
  }

  if (listing.daysOnMarket >= 45) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
  }

  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
}

function getStatusLabel(listing: PropertyManagementListing) {
  if (listing.status === "Closed" || listing.status === "Sold" || listing.status === "Rented") {
    return listing.status
  }

  if (listing.status !== "Open" && listing.status !== "Active") {
    return listing.status.replace(/([A-Z])/g, " $1").trim()
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
  onViewPropertyClick,
  searchTerm,
  statusCards,
  totalPages,
  totalResults,
  visibleAgents,
}: Section1SectionProps) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 lg:px-8">
      <Card>
        <CardHeader>
          <div>
            <CardDescription>{"Admin Workspace"}</CardDescription>
            <CardTitle>{"Property Management"}</CardTitle>
            <CardDescription className="max-w-3xl">
              {"Track every listing and click any property to open its complete lead, showing, feedback, and document workspace."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[260px] flex-1">
              <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" name="search" />
              <Input
                className="pl-9"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search listings, cities, or agents"
                type="text"
                value={searchTerm}
              />
            </div>
            <Button onClick={onAddPropertyClick} type="button">
              <AppIcon data-icon="inline-start" name="add" />
              {"Add Property"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <CardDescription>{card.label}</CardDescription>
                <CardTitle>{card.value}</CardTitle>
              </div>
              <AppIcon className="text-primary" name={card.icon} />
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{card.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-3">
              {quickFilters.map((filter) => (
                <Button
                  key={filter.id}
                  onClick={() => onFilterChange(filter.id)}
                  size="sm"
                  type="button"
                  variant={activeFilter === filter.id ? "default" : "outline"}
                >
                  <AppIcon data-icon="inline-start" name={filter.icon} />
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Select modal={false} onValueChange={(value) => onTypeChange((value ?? activeType) as "All" | "Residential" | "Commercial")} value={activeType}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="All">{"All Types"}</SelectItem>
                    <SelectItem value="Residential">{"Residential"}</SelectItem>
                    <SelectItem value="Commercial">{"Commercial"}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => onAgentChange(!value || value === "all-agents" ? "" : value)} value={activeAgent || "all-agents"}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all-agents">{"All Agents"}</SelectItem>
                    {visibleAgents.map((agent) => (
                      <SelectItem key={agent} value={agent}>{agent}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="grid gap-1 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <CardTitle>{"Your Listings"}</CardTitle>
            <CardDescription>
              {`${totalResults} total result${totalResults === 1 ? "" : "s"} across ${totalPages} page${totalPages === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {`Page ${currentPage} of ${Math.max(totalPages, 1)}`}
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{"Listing"}</TableHead>
                <TableHead>{"Type"}</TableHead>
                <TableHead>{"Price"}</TableHead>
                <TableHead>{"Agent"}</TableHead>
                <TableHead>{"Status"}</TableHead>
                <TableHead>{"Days Open"}</TableHead>
                <TableHead>{"Forecast"}</TableHead>
                <TableHead className="text-right">{"Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>{"Loading listings..."}</EmptyTitle></EmptyHeader></Empty></TableCell></TableRow>
              ) : errorMessage ? (
                <TableRow><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>{errorMessage}</EmptyTitle></EmptyHeader></Empty></TableCell></TableRow>
              ) : listings.length === 0 ? (
                <TableRow><TableCell colSpan={8}><Empty><EmptyHeader><EmptyTitle>{"No listings"}</EmptyTitle><EmptyDescription>{"No listings match the current filters."}</EmptyDescription></EmptyHeader></Empty></TableCell></TableRow>
              ) : (
                listings.map((listing) => (
                  <TableRow
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    key={listing.id}
                    onClick={() => onViewPropertyClick(listing.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div
                          className="h-14 w-20 rounded-md bg-cover bg-center"
                          data-alt={listing.imageAlt}
                          style={{ backgroundImage: `url("${listing.imageSrc}")` }}
                        />
                        <div>
                          <button
                            className="text-left font-medium hover:underline"
                            onClick={(event) => {
                              event.stopPropagation()
                              onViewPropertyClick(listing.id)
                            }}
                            type="button"
                          >
                            {listing.addressLine1}
                          </button>
                          <p className="text-muted-foreground">{listing.addressLine2}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{listing.propertyType}</p>
                      <p className="text-muted-foreground">{listing.listingType}</p>
                    </TableCell>
                    <TableCell className="font-medium">{listing.price}</TableCell>
                    <TableCell>{listing.agent}</TableCell>
                    <TableCell>
                      <Badge className={cn(getStatusClasses(listing))} variant="secondary">
                        {getStatusLabel(listing)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {listing.status === "Closed" ? "-" : `${listing.daysOnMarket} days`}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{`${listing.predictedSellDays} days`}</p>
                      <p className="text-muted-foreground">{listing.predictionLabel}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label="Open property workspace"
                          onClick={(event) => {
                            event.stopPropagation()
                            onViewPropertyClick(listing.id)
                          }}
                          size="icon-sm"
                          type="button"
                          variant="ghost"
                        >
                          <AppIcon name="manage_search" />
                        </Button>
                        <Button
                          aria-label="Edit property"
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
                          onClick={(event) => event.stopPropagation()}
                          render={<Link href={`/properties/${listing.slug}`} />}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <AppIcon name="visibility" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <PagePagination currentPage={currentPage} onPageChange={onPageChange} totalPages={totalPages} />
        </CardFooter>
      </Card>
    </main>
  )
}
