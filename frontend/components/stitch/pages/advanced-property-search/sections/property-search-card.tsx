/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PropertyItem } from "@/hooks/use-real-estate-api"
import { formatPriceLabel } from "@/lib/currency"
import { cn } from "@/lib/utils"
import {
  listingTypeLabel,
  PROPERTY_FALLBACK_IMAGE,
  propertyTypeLabel,
  type PropertyViewMode,
} from "./property-search-helpers"

const propertyCardIcons = ["bed", "bathtub", "square_foot"] as const

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? PROPERTY_FALLBACK_IMAGE
}

function listingSpecs(property: PropertyItem) {
  return [
    property.bedRoom ? `${property.bedRoom} Beds` : "Beds N/A",
    property.bathRoom ? `${property.bathRoom} Baths` : "Baths N/A",
    property.width || "Size N/A",
  ] as const
}

export function PropertySearchCard({
  property,
  viewMode,
}: {
  property: PropertyItem
  viewMode: PropertyViewMode
}) {
  const isListView = viewMode === "list"

  return (
    <Card className="group p-0" key={property.id}>
      <Link
        className={cn("block h-full", isListView && "sm:flex")}
        href={`/properties/${property.slug}`}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isListView ? "h-56 sm:h-auto sm:min-h-56 sm:w-72 sm:shrink-0" : "h-52 w-full",
          )}
        >
          <img
            alt={property.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            src={listingImage(property)}
          />
          <Badge className="absolute left-3 top-3 shadow-sm">
            {listingTypeLabel(property.listingType)}
          </Badge>
        </div>
        <CardContent
          className={cn(
            "p-5",
            isListView && "flex flex-1 flex-col justify-between gap-5 sm:p-6",
          )}
        >
          <div>
            <p className="text-2xl font-semibold tracking-tight text-primary">
              {formatPriceLabel(property.price)}
            </p>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
              <AppIcon className="mt-0.5 shrink-0" name="location_on" />
              <span className={cn(!isListView && "line-clamp-1")}>
                {property.location || property.exactLocation}
              </span>
            </div>
            <Badge className="mt-3" variant="secondary">
              {propertyTypeLabel(property.propertyType)}
            </Badge>
          </div>
          <div
            className={cn(
              "mt-5 border-t pt-4 text-sm text-muted-foreground",
              isListView ? "grid gap-2 sm:grid-cols-3" : "flex items-center justify-between gap-3",
            )}
          >
            {listingSpecs(property).map((spec, index) => (
              <div className="flex min-w-0 items-center gap-1.5" key={`${property.id}-${spec}`}>
                <AppIcon className="shrink-0 text-muted-foreground" name={propertyCardIcons[index] ?? "square_foot"} />
                <span className="truncate">{spec}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
