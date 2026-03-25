/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { formatPriceLabel } from "@/lib/currency"
import type { PropertyItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type FeaturedListingsSectionProps = {
  properties: PropertyItem[]
}

const fallbackImage = "https://placehold.co/1200x800/e2e8f0/0f172a?text=EstateBlue"
const specIcons = ["bed", "bathtub", "square_foot"] as const

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? fallbackImage
}

function listingBadge(property: PropertyItem, index: number) {
  if (index === 0) {
    return "Featured"
  }

  if (property.listingType === "ForRent") {
    return "For Rent"
  }

  return "Open Now"
}

function listingSpecs(property: PropertyItem) {
  return [
    property.bedRoom ? `${property.bedRoom} Beds` : "Beds N/A",
    property.bathRoom ? `${property.bathRoom} Baths` : "Baths N/A",
    property.width ? property.width : "Size N/A",
  ]
}

export function FeaturedListingsSection({ properties }: FeaturedListingsSectionProps) {
  const featuredListings = properties.slice(0, 3)

  return (
    <section className="bg-background-light py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-12 flex justify-between items-end">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {"Exclusives"}
            </span>
            <h2 className="text-4xl font-black text-primary mt-2">
              {"Featured Listings"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="p-3 border border-slate-300 hover:bg-primary hover:text-white transition-colors" type="button">
              <AppIcon name="arrow_back" />
            </button>
            <button className="p-3 border border-slate-300 hover:bg-primary hover:text-white transition-colors" type="button">
              <AppIcon name="arrow_forward" />
            </button>
          </div>
        </div>
        {featuredListings.length === 0 ? (
          <div className="border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              {"No Live Listings Yet"}
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-600">
              {"Add public properties from the backend and they will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            {featuredListings.map((listing, index) => (
              <article
                key={listing.id}
                className="group overflow-hidden border border-slate-200 bg-white"
              >
                <Link href={`/properties/${listing.slug}`} className="block">
                  <div className="relative h-64 overflow-hidden">
                    <img
                      alt={listing.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={listingImage(listing)}
                    />
                    <span className="absolute left-4 top-4 bg-primary px-3 py-1 text-[10px] font-bold uppercase text-white">
                      {listingBadge(listing, index)}
                    </span>
                    <span className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 text-lg font-black text-primary">
                      {formatPriceLabel(listing.price)}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-primary">
                      {listing.title}
                    </h3>
                    <p className="mb-6 flex items-center gap-1 text-sm text-slate-500">
                      <AppIcon className="text-sm" name="location_on" />
                      {listing.location || listing.exactLocation}
                    </p>
                    <div className="flex justify-between border-t border-slate-100 py-4">
                      {listingSpecs(listing).map((spec, specIndex) => (
                        <div key={`${listing.id}-${spec}`} className="flex items-center gap-2">
                          <AppIcon className="text-slate-400" name={specIcons[specIndex] ?? "square_foot"} />
                          <span className="text-xs font-bold text-slate-700">
                            {spec}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
