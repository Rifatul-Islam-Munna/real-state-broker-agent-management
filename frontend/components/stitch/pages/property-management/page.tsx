"use client"

import { useState } from "react"

import { propertyManagementListings } from "@/static-data/pages/property-management/listings"

import {
  type PropertyManagementFilter,
  Section1Section,
} from "./sections/section-1"
import { AddPropertyModalOverlaySection } from "./sections/add-property-modal-overlay"

export function PropertyManagementPage() {
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<PropertyManagementFilter>("all")

  const filteredListings = propertyManagementListings.filter((listing) => {
    if (activeFilter === "open") {
      return listing.status === "Open"
    }

    if (activeFilter === "closed") {
      return listing.status === "Closed"
    }

    if (activeFilter === "long-open") {
      return listing.status === "Open" && listing.daysOnMarket >= 45
    }

    return true
  })

  return (
    <div className="font-sans bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <Section1Section
        activeFilter={activeFilter}
        listings={filteredListings}
        onAddPropertyClick={() => setIsAddPropertyOpen(true)}
        onFilterChange={setActiveFilter}
      />
      {isAddPropertyOpen ? (
        <AddPropertyModalOverlaySection onClose={() => setIsAddPropertyOpen(false)} />
      ) : null}
    </div>
  )
}
