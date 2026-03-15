/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { sellerListYourPropertyPageMeta } from "@/static-data/pages/seller-list-your-property/meta"
import { AppIcon } from "@/components/ui/app-icon"

type SearchMode = "buy" | "rent" | "sell"

const searchModes: Record<
  SearchMode,
  {
    inputPlaceholder: string
    selectLabel: string
    propertyTypes: string[]
    ctaLabel: string
    ctaHref: string
  }
> = {
  buy: {
    inputPlaceholder: "Neighborhood, City, or Zip...",
    selectLabel: "Property Type",
    propertyTypes: ["Apartment", "Villa", "Townhome", "Condo"],
    ctaLabel: "Search Now",
    ctaHref: "/property-search",
  },
  rent: {
    inputPlaceholder: "City, building, or Zip...",
    selectLabel: "Rental Type",
    propertyTypes: ["Apartment", "Townhome", "Loft", "Studio"],
    ctaLabel: "Browse Rentals",
    ctaHref: "/property-search",
  },
  sell: {
    inputPlaceholder: "Enter your property address...",
    selectLabel: "Property Category",
    propertyTypes: ["House", "Condo", "Land", "Luxury Home"],
    ctaLabel: "List Your Property",
    ctaHref: sellerListYourPropertyPageMeta.routePath,
  },
}

export function HeroSection() {
  const [activeMode, setActiveMode] = useState<SearchMode>("buy")
  const currentMode = searchModes[activeMode]

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
          <div className="flex flex-col md:flex-row gap-2 p-4">
            <div className="flex-1 flex items-center border border-slate-200 px-4 py-3">
              <AppIcon className="text-slate-400 mr-2" name="location_on" />
              <input
                className="w-full border-none focus:ring-0 text-sm"
                placeholder={currentMode.inputPlaceholder}
                type="text"
              />
            </div>
            <div className="flex-1 flex items-center border border-slate-200 px-4 py-3">
              <AppIcon className="text-slate-400 mr-2" name="home" />
              <select className="w-full border-none focus:ring-0 text-sm appearance-none bg-transparent">
                <option>
                  {currentMode.selectLabel}
                </option>
                {currentMode.propertyTypes.map((propertyType) => (
                  <option key={propertyType}>
                    {propertyType}
                  </option>
                ))}
              </select>
            </div>
            <Link
              className="bg-accent px-10 py-4 text-center text-sm font-bold uppercase text-white hover:brightness-110"
              href={currentMode.ctaHref}
            >
              {currentMode.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
