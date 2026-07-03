"use client"

import { useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { propertyTypeLabel } from "./property-search-helpers"

type PropertySearchFilterPanelProps = {
  initialListingType: "" | "ForSale" | "ForRent"
  initialPropertyType: "" | "Residential" | "Commercial"
  initialSearch: string
  listingTypeOptions: Array<"ForSale" | "ForRent">
  locations: string[]
  onApply: (values: {
    listingType: "" | "ForSale" | "ForRent"
    propertyType: "" | "Residential" | "Commercial"
    search: string
  }) => void
  onReset: () => void
  propertyTypeOptions: Array<"Residential" | "Commercial">
}

export function PropertySearchFilterPanel({
  initialListingType,
  initialPropertyType,
  initialSearch,
  listingTypeOptions,
  locations,
  onApply,
  onReset,
  propertyTypeOptions,
}: PropertySearchFilterPanelProps) {
  const [draftSearch, setDraftSearch] = useState(initialSearch)
  const [draftListingType, setDraftListingType] = useState(initialListingType)
  const [draftPropertyType, setDraftPropertyType] = useState(initialPropertyType)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="property-search-filter">{"Search"}</Label>
        <div className="relative">
          <AppIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" name="search" />
          <Input
            className="pl-9"
            id="property-search-filter"
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="City, neighborhood, ZIP, or title"
            type="text"
            value={draftSearch}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{"Listing type"}</Label>
        <Select
          modal={false}
          onValueChange={(value) =>
            setDraftListingType(!value || value === "all" ? "" : (value as "ForSale" | "ForRent"))
          }
          value={draftListingType || "all"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All listings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"All listings"}</SelectItem>
            {listingTypeOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "ForRent" ? "For rent" : "For sale"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{"Property category"}</Label>
        <Select
          modal={false}
          onValueChange={(value) =>
            setDraftPropertyType(
              !value || value === "all" ? "" : (value as "Residential" | "Commercial"),
            )
          }
          value={draftPropertyType || "all"}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{"All categories"}</SelectItem>
            {propertyTypeOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {propertyTypeLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>{"Popular markets"}</Label>
        {locations.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {"Locations will appear here once public properties are added."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {locations.map((location) => (
              <Button
                key={location}
                onClick={() => setDraftSearch(location)}
                size="xs"
                type="button"
                variant="outline"
              >
                {location}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-2 pt-1">
        <Button
          onClick={() =>
            onApply({
              listingType: draftListingType,
              propertyType: draftPropertyType,
              search: draftSearch,
            })
          }
          type="button"
        >
          {"Apply filters"}
        </Button>
        <Button onClick={onReset} type="button" variant="outline">
          {"Reset"}
        </Button>
      </div>
    </div>
  )
}
