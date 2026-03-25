/* eslint-disable @next/next/no-img-element */

"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { sellerListYourPropertyPageMeta } from "@/static-data/pages/seller-list-your-property/meta"
import type { PublicPropertyFilters } from "@/types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SearchMode = "buy" | "rent" | "sell"

type HeroSectionProps = {
  filterOptions: PublicPropertyFilters
}

const searchModes: Record<
  SearchMode,
  {
    inputPlaceholder: string
    selectLabel: string
    ctaLabel: string
    ctaHref?: string
    listingType?: "ForSale" | "ForRent"
  }
> = {
  buy: {
    inputPlaceholder: "Neighborhood, City, or Zip...",
    selectLabel: "Property Type",
    ctaLabel: "Search Now",
    listingType: "ForSale",
  },
  rent: {
    inputPlaceholder: "City, building, or Zip...",
    selectLabel: "Rental Type",
    ctaLabel: "Browse Rentals",
    listingType: "ForRent",
  },
  sell: {
    inputPlaceholder: "Enter your property address...",
    selectLabel: "Property Category",
    ctaLabel: "List Your Property",
    ctaHref: sellerListYourPropertyPageMeta.routePath,
  },
}

function propertyTypeLabel(propertyType: "Residential" | "Commercial") {
  return propertyType === "Commercial" ? "Commercial" : "Residential"
}

export function HeroSection({ filterOptions }: HeroSectionProps) {
  const [activeMode, setActiveMode] = useState<SearchMode>("buy")
  const [searchTerm, setSearchTerm] = useState("")
  const [propertyType, setPropertyType] = useState("")
  const router = useRouter()
  const currentMode = searchModes[activeMode]
  const propertyTypes = useMemo(
    () =>
      filterOptions.propertyTypes.length > 0
        ? filterOptions.propertyTypes
        : (["Residential", "Commercial"] as const),
    [filterOptions.propertyTypes],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (activeMode === "sell") {
      router.push(currentMode.ctaHref ?? sellerListYourPropertyPageMeta.routePath)
      return
    }

    const params = new URLSearchParams()

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim())
    }

    if (propertyType) {
      params.set("propertyType", propertyType)
    }

    if (currentMode.listingType) {
      params.set("listingType", currentMode.listingType)
    }

    router.push(`/property-search${params.toString() ? `?${params.toString()}` : ""}`)
  }

  return (
    <section className="relative h-[650px] flex items-center justify-center bg-slate-200">
      <div className="absolute inset-0 z-0">
        <img
          alt="Luxury modern house exterior"
          className="w-full h-full object-cover brightness-50"
          data-alt="Luxury modern house exterior with glass windows"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNzyh5mt5knkbR3OCn2xCpbUmNOq2pGyTdwYKMzAj70mI62TdwalfugFIumWCtRPu1VcMVKavr6TsX3BP9lgHwHBq-xhF-VnEFTDtMtQJ-wrvaOG6gXu0BlNF1EQnKMK69jCZMXYqKgMz4OlmOlrfDLbMLaDMKJS1Ee_Ucwy8be2XaIbNp3LF1N0_oHsqPEm9bvzeAlhVo7ySGdd4IhWNhurSiZxafHVQEkQhoby-KWNBJ72WRT5PUMOQRTj8IONpCs8zbHzfXMds"
        />
      </div>
      <div className="relative z-10 w-full max-w-4xl px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tight">
          {" Your Vision. Our Expertise. "}
          <br />
          <span className="text-accent">
            {"Exceptional Results."}
          </span>
        </h1>
        <p className="text-white/90 text-lg mb-10 max-w-2xl mx-auto">
          {"Discover a new level of real estate excellence with personalized service and market-leading insights."}
        </p>
        <div className="bg-white p-2">
          <div className="flex border-b border-slate-100">
            {(["buy", "rent", "sell"] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={activeMode === mode}
                className={cn(
                  "px-8 py-3 font-bold text-xs uppercase transition-colors",
                  activeMode === mode
                    ? "bg-primary text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50",
                )}
                onClick={() => setActiveMode(mode)}
                type="button"
              >
                {mode}
              </button>
            ))}
          </div>
          <form className="flex flex-col gap-2 p-4 md:flex-row" onSubmit={handleSubmit}>
            <div className="flex flex-1 items-center border border-slate-200 px-4 py-3">
              <AppIcon className="text-slate-400 mr-2" name="location_on" />
              <Input
                className="h-auto border-none px-0 py-0 text-sm shadow-none focus-visible:ring-0"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={currentMode.inputPlaceholder}
                type="text"
                value={searchTerm}
              />
            </div>
            <div className="flex flex-1 items-center border border-slate-200 px-4 py-3">
              <AppIcon className="text-slate-400 mr-2" name="home" />
              <Select
                modal={false}
                onValueChange={(value) => setPropertyType(!value || value === "all" ? "" : value)}
                value={propertyType || "all"}
              >
                <SelectTrigger className="h-auto w-full border-none px-0 py-0 text-sm shadow-none focus-visible:ring-0">
                  <SelectValue placeholder={currentMode.selectLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {currentMode.selectLabel}
                  </SelectItem>
                  {propertyTypes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {propertyTypeLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              className="bg-accent px-10 py-4 text-center text-sm font-bold uppercase text-white hover:brightness-110"
              type="submit"
            >
              {currentMode.ctaLabel}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
