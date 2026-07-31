/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import type { PropertyItem } from "@/hooks/use-real-estate-api"
import { formatPriceLabel } from "@/lib/currency"
import {
  listingTypeLabel,
  PROPERTY_FALLBACK_IMAGE,
  propertyTypeLabel,
  type PropertyViewMode,
} from "./property-search-helpers"

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? PROPERTY_FALLBACK_IMAGE
}

export function PropertySearchCard({ property }: { property: PropertyItem; viewMode: PropertyViewMode }) {
  const location = property.location || property.exactLocation || "Location available on request"

  return (
    <article className="group overflow-hidden rounded-[24px] bg-white shadow-[0_5px_22px_rgba(15,23,42,.045)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(67,67,213,.10)]">
      <Link href={`/properties/${property.slug}`} className="block">
        <div className="relative h-64 overflow-hidden bg-slate-200 sm:h-72">
          <img src={listingImage(property)} alt={property.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-lg bg-[#71f8e4] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#005048]">{listingTypeLabel(property.listingType)}</span>
            {property.isFeatured ? <span className="rounded-lg bg-[#213145]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Featured</span> : null}
          </div>
          <span className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-white backdrop-blur-md">
            <AppIcon name="favorite" />
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight text-[#0b1c30]">{property.title}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-[#626777]"><AppIcon className="text-base" name="location_on" />{location}</p>
            </div>
            <p className="shrink-0 text-3xl font-bold tracking-[-0.04em] text-[#4343d5]">{formatPriceLabel(property.price)}</p>
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-[#d9d9e5] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4 text-sm text-[#5e6372]">
              <span className="flex items-center gap-1"><AppIcon className="text-lg" name="bed" />{property.bedRoom || "—"}</span>
              <span className="flex items-center gap-1"><AppIcon className="text-lg" name="bathtub" />{property.bathRoom || "—"}</span>
              <span className="flex items-center gap-1"><AppIcon className="text-lg" name="square_foot" />{property.width || "Size N/A"}</span>
              <span className="rounded-full bg-[#eff2ff] px-3 py-1 text-xs font-semibold text-[#4343d5]">{propertyTypeLabel(property.propertyType)}</span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-bold text-[#4343d5]">View Details <AppIcon className="text-base" name="arrow_forward" /></span>
          </div>
        </div>
      </Link>
    </article>
  )
}
