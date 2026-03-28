/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useState } from "react"

import { formatCurrencyAmount, formatPriceLabel, parseCurrencyValue } from "@/lib/currency"
import type { PropertyItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PropertyChatDialog } from "./property-chat-dialog"

type Section2SectionProps = {
  property: PropertyItem
  relatedProperties: PropertyItem[]
}

const fallbackImage = "https://placehold.co/1200x800/e2e8f0/0f172a?text=EstateBlue"

function parseNumericValue(value: string) {
  return parseCurrencyValue(value)
}

function formatCurrency(value: number) {
  return formatCurrencyAmount(value)
}

function estimateMonthlyPayment(priceLabel: string) {
  const price = parseNumericValue(priceLabel)

  if (!price) {
    return formatCurrency(0)
  }

  const principal = price * 0.8
  const monthlyRate = 0.065 / 12
  const totalMonths = 30 * 12
  const payment =
    (principal * monthlyRate * (1 + monthlyRate) ** totalMonths) /
    ((1 + monthlyRate) ** totalMonths - 1)

  return formatCurrency(payment)
}

function imageGallery(property: PropertyItem) {
  const uniqueImages = Array.from(
    new Set([property.thumbnailUrl, ...property.imageUrls].filter(Boolean) as string[]),
  )

  if (uniqueImages.length === 0) {
    return [fallbackImage]
  }

  return uniqueImages
}

function propertyLocationParts(property: PropertyItem) {
  return (property.location || property.exactLocation)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function listingTypeLabel(property: PropertyItem) {
  return property.listingType === "ForRent" ? "For Rent" : "For Sale"
}

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? fallbackImage
}

function titleCaseStatus(value: string) {
  return value.replace(/([A-Z])/g, " $1").trim()
}

function areaLabel(property: PropertyItem) {
  return property.width || "Size N/A"
}

export function Section2Section({ property, relatedProperties }: Section2SectionProps) {
  const gallery = imageGallery(property)
  const previewImages = gallery.slice(0, 5)
  const locationParts = propertyLocationParts(property)
  const cityLabel = locationParts[0] ?? property.location ?? "Featured Area"
  const agentName = property.agent?.fullName ?? "EstateBlue Listing Desk"
  const agentRole = property.agent?.agencyName ?? "Premier Listing Advisor"
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const remainingGalleryCount = Math.max(gallery.length - previewImages.length, 0)
  const predictionConfidence = Math.round((property.sellPrediction?.confidence ?? 0) * 100)

  function openGallery(index: number) {
    setActiveImageIndex(index)
    setIsGalleryOpen(true)
  }

  function moveGallery(step: number) {
    setActiveImageIndex((currentIndex) => {
      const nextIndex = currentIndex + step

      if (nextIndex < 0) {
        return gallery.length - 1
      }

      if (nextIndex >= gallery.length) {
        return 0
      }

      return nextIndex
    })
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-20">
      <nav className="mb-6 flex flex-wrap gap-2 text-xs font-medium uppercase tracking-widest text-secondary">
        <Link href="/">
          {"Home"}
        </Link>
        <span>{"/"}</span>
        <Link href="/property-search">
          {"Properties"}
        </Link>
        {locationParts.map((part) => (
          <span key={`${part}-crumb`} className="contents">
            <span>{"/"}</span>
            <span>{part}</span>
          </span>
        ))}
        <span>{"/"}</span>
        <span className="text-primary">
          {property.title}
        </span>
      </nav>

      <div className="mb-3 grid h-[500px] grid-cols-1 gap-2 md:grid-cols-4 md:grid-rows-2">
        <button
          className="group relative overflow-hidden bg-slate-200 text-left md:col-span-2 md:row-span-2"
          onClick={() => openGallery(0)}
          type="button"
        >
          <img
            alt={property.title}
            className="h-full w-full object-cover"
            src={previewImages[0]}
          />
          <div className="absolute bottom-4 left-4 bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary">
            {`View ${gallery.length} Photos`}
          </div>
        </button>
        {previewImages.slice(1).map((image, index) => {
          const galleryIndex = index + 1
          const showMoreOverlay =
            galleryIndex === previewImages.length - 1 && remainingGalleryCount > 0

          return (
            <button
              key={`${image}-${galleryIndex}`}
              className="relative hidden overflow-hidden bg-slate-200 md:block"
              onClick={() => openGallery(galleryIndex)}
              type="button"
            >
              <img
                alt={`${property.title} photo ${galleryIndex + 1}`}
                className="h-full w-full object-cover"
                src={image}
              />
              {showMoreOverlay ? (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/45">
                  <span className="text-lg font-bold text-white">
                    {`+${remainingGalleryCount} Photos`}
                  </span>
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mb-8 flex md:hidden">
        <button
          className="w-full border border-primary/15 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary"
          onClick={() => openGallery(0)}
          type="button"
        >
          {`Open All ${gallery.length} Photos`}
        </button>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row">
        <div className="flex-1">
          <div className="mb-8 flex flex-col justify-between border-b-2 border-primary/10 pb-6 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  {listingTypeLabel(property)}
                </span>
                <span className="bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
                  {titleCaseStatus(property.status)}
                </span>
              </div>
              <h2 className="mb-2 text-3xl font-800 text-primary">
                {property.title}
              </h2>
              <p className="flex items-center gap-1 font-medium uppercase tracking-wide text-secondary">
                <AppIcon className="text-sm" name="location_on" />
                {property.location || property.exactLocation}
              </p>
            </div>
            <div className="mt-4 text-right md:mt-0">
              <span className="text-4xl font-900 text-primary">
                {formatPriceLabel(property.price)}
              </span>
              <p className="mt-1 text-xs font-bold uppercase text-accent">
                {`Estimated ${estimateMonthlyPayment(property.price)}/mo`}
              </p>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-3 gap-4 border-2 border-primary/10 bg-white p-6">
            <div className="text-center">
              <AppIcon className="text-secondary block mb-1" name="bed" />
              <span className="text-xl font-800">
                {property.bedRoom || "--"}
              </span>
              <p className="text-xs font-semibold uppercase text-secondary">
                {"Bedrooms"}
              </p>
            </div>
            <div className="border-x-2 border-primary/10 text-center">
              <AppIcon className="text-secondary block mb-1" name="bathtub" />
              <span className="text-xl font-800">
                {property.bathRoom || "--"}
              </span>
              <p className="text-xs font-semibold uppercase text-secondary">
                {"Bathrooms"}
              </p>
            </div>
            <div className="text-center">
              <AppIcon className="text-secondary block mb-1" name="square_foot" />
              <span className="text-xl font-800">
                {areaLabel(property)}
              </span>
              <p className="text-xs font-semibold uppercase text-secondary">
                {"Sq. Ft."}
              </p>
            </div>
          </div>

          <div className="mb-12">
            <h3 className="mb-4 border-l-4 border-accent pl-4 text-xl font-800 uppercase tracking-tight">
              {"Property Description"}
            </h3>
            <p className="text-lg leading-relaxed text-slate-600">
              {property.description || "Property description coming soon."}
            </p>
            {property.exactLocation ? (
              <p className="mt-4 leading-relaxed text-slate-600">
                {`Exact location: ${property.exactLocation}`}
              </p>
            ) : null}
          </div>

          <div className="mb-12">
            <h3 className="mb-4 border-l-4 border-accent pl-4 text-xl font-800 uppercase tracking-tight">
              {"Key Amenities"}
            </h3>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {(property.keyAmenities.length > 0 ? property.keyAmenities : ["Amenity details will appear once added in the backend."]).map((amenity) => (
                <div key={amenity} className="flex items-center gap-3 border-b border-primary/5 py-2">
                  <AppIcon className="text-primary" name="check_circle" />
                  <span className="font-medium">
                    {amenity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-12 bg-white p-8">
            <h3 className="mb-6 border-l-4 border-accent pl-4 text-xl font-800 uppercase tracking-tight">
              {"Neighborhood Insight"}
            </h3>
            {property.neighborhoodInsights.length === 0 ? (
              <p className="leading-relaxed text-slate-600">
                {"Neighborhood notes will appear here once they are added to the property in the backend."}
              </p>
            ) : (
              <div className="grid gap-8 md:grid-cols-2">
                {property.neighborhoodInsights.slice(0, 4).map((insight) => (
                  <div key={`${insight.title}-${insight.description}`}>
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
                      {insight.title}
                    </h4>
                    <p className="text-sm leading-7 text-slate-600">
                      {insight.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mb-12 border-2 border-primary/20 bg-primary/5 p-8">
            <h3 className="mb-6 text-xl font-800 uppercase tracking-tight">
              {"Mortgage Calculator"}
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase">
                  {"Home Price"}
                </label>
                <Input
                  className="h-auto w-full border-2 border-primary/20 bg-white p-3"
                  defaultValue={formatPriceLabel(property.price)}
                  type="text"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase">
                  {"Down Payment"}
                </label>
                <div className="flex">
                  <Input
                    className="h-auto w-full rounded-r-none border-2 border-primary/20 bg-white p-3"
                    defaultValue={formatCurrency(parseNumericValue(property.price) * 0.2)}
                    type="text"
                  />
                  <Input
                    className="h-auto w-20 rounded-l-none border-2 border-l-0 border-primary/20 bg-primary/10 p-3 text-center"
                    defaultValue="20%"
                    type="text"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase">
                  {"Loan Term"}
                </label>
                <Select defaultValue="30 Year Fixed" modal={false}>
                  <SelectTrigger className="h-auto w-full rounded-none border-2 border-primary/20 bg-white p-3 shadow-none focus-visible:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30 Year Fixed">
                      {"30 Year Fixed"}
                    </SelectItem>
                    <SelectItem value="15 Year Fixed">
                      {"15 Year Fixed"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase">
                  {"Interest Rate"}
                </label>
                <Input
                  className="h-auto w-full border-2 border-primary/20 bg-white p-3"
                  defaultValue="6.5%"
                  type="text"
                />
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-primary/10 pt-6 md:flex-row">
              <div className="text-center md:text-left">
                <p className="text-xs font-bold uppercase text-secondary">
                  {"Estimated Monthly Payment"}
                </p>
                <p className="text-4xl font-900 text-primary">
                  {estimateMonthlyPayment(property.price)}
                </p>
              </div>
              <Link className="w-full bg-primary px-10 py-4 text-center text-sm font-bold uppercase tracking-widest text-white md:w-auto" href="/contact-us">
                {"Get Pre-Approved"}
              </Link>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-96">
          <div className="sticky top-8 space-y-6">
            <div className="border-2 border-accent/20 bg-accent/5 p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                {"ML Sell-Time Forecast"}
              </p>
              <p className="mt-3 text-4xl font-900 text-primary">
                {`${property.sellPrediction?.predictedDays ?? 0} days`}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {property.sellPrediction?.basis ?? "Forecast available once enough history exists."}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary/10 pt-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {"Confidence"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {`${predictionConfidence}%`}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {"History Used"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {`${property.sellPrediction?.trainingSampleSize ?? 0} closed listings`}
                  </p>
                </div>
              </div>
            </div>
            <div className="border-2 border-primary bg-white p-8">
              <h3 className="mb-6 border-b border-primary/10 pb-4 text-center text-lg font-800 uppercase text-primary">
                {"Inquire About Listing"}
              </h3>
              <div className="mb-6 flex items-center gap-4">
                <img
                  alt={agentName}
                  className="h-20 w-20 object-cover"
                  src={property.agent?.avatarUrl ?? fallbackImage}
                />
                <div>
                  <h4 className="font-800 text-primary">
                    {agentName}
                  </h4>
                  <p className="text-xs font-semibold uppercase text-secondary">
                    {agentRole}
                  </p>
                  <div className="mt-1 flex text-accent">
                    <AppIcon className="text-sm" name="star" />
                    <AppIcon className="text-sm" name="star" />
                    <AppIcon className="text-sm" name="star" />
                    <AppIcon className="text-sm" name="star" />
                    <AppIcon className="text-sm" name="star" />
                  </div>
                </div>
              </div>
              <p className="mb-6 text-xs italic text-slate-500">
                {property.agent?.isVerifiedAgent
                  ? "\"Verified agent profile connected from the backend.\""
                  : "\"Reach out for pricing, availability, and private tour scheduling.\""}
              </p>
              <div className="space-y-4">
                <button
                  className="flex w-full items-center justify-center gap-2 bg-primary py-4 text-xs font-bold uppercase tracking-widest text-white"
                  onClick={() => setIsChatOpen(true)}
                  type="button"
                >
                  <AppIcon className="text-sm" name="mail" />
                  {"Contact Agent"}
                </button>
                <Link
                  className="flex w-full items-center justify-center gap-2 border-2 border-primary py-4 text-xs font-bold uppercase tracking-widest text-primary"
                  href="/schedule-a-viewing"
                >
                  <AppIcon className="text-sm" name="calendar_month" />
                  {"Schedule Viewing"}
                </Link>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <section className="mt-20">
        <h3 className="mb-8 text-2xl font-800 uppercase tracking-tight text-primary">
          {`Similar Properties in ${cityLabel}`}
        </h3>
        {relatedProperties.length === 0 ? (
          <div className="border border-primary/10 bg-white p-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              {"No similar public properties are available right now."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {relatedProperties.map((item, index) => (
              <Link
                key={item.id}
                className="group cursor-pointer border border-primary/10 bg-white"
                href={`/properties/${item.slug}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={listingImage(item)}
                  />
                  <span className={`absolute left-4 top-4 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white ${index === 0 ? "bg-primary" : "bg-accent"}`}>
                    {index === 0 ? "Featured Match" : listingTypeLabel(item)}
                  </span>
                </div>
                <div className="p-6">
                  <p className="mb-1 text-2xl font-900 text-primary">
                    {formatPriceLabel(item.price)}
                  </p>
                  <p className="mb-4 text-xs font-bold uppercase text-secondary">
                    {item.location || item.exactLocation}
                  </p>
                  <div className="flex gap-4 border-t border-primary/5 pt-4 text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <AppIcon className="text-sm text-secondary" name="bed" />
                      {item.bedRoom || "--"}
                    </span>
                    <span className="flex items-center gap-1">
                      <AppIcon className="text-sm text-secondary" name="bathtub" />
                      {item.bathRoom || "--"}
                    </span>
                    <span className="flex items-center gap-1">
                      <AppIcon className="text-sm text-secondary" name="square_foot" />
                      {areaLabel(item)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
        <DialogContent
          className="max-w-6xl overflow-hidden bg-slate-950 p-0 text-white ring-white/10"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">
            {`${property.title} image gallery`}
          </DialogTitle>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative flex min-h-[60vh] items-center justify-center bg-black">
              <img
                alt={`${property.title} ${activeImageIndex + 1}`}
                className="max-h-[78vh] w-full object-contain"
                src={gallery[activeImageIndex]}
              />
              {gallery.length > 1 ? (
                <>
                  <button
                    className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    onClick={() => moveGallery(-1)}
                    type="button"
                  >
                    <AppIcon name="chevron_left" />
                  </button>
                  <button
                    className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                    onClick={() => moveGallery(1)}
                    type="button"
                  >
                    <AppIcon name="chevron_right" />
                  </button>
                </>
              ) : null}
              <div className="absolute left-4 top-4 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-white">
                {`${activeImageIndex + 1} / ${gallery.length}`}
              </div>
            </div>
            <div className="border-t border-white/10 bg-slate-950/95 p-4 lg:border-t-0 lg:border-l">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-white/55">
                {"All Photos"}
              </p>
              <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    className={`overflow-hidden border transition ${
                      index === activeImageIndex
                        ? "border-accent"
                        : "border-white/10 hover:border-white/35"
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                    type="button"
                  >
                    <img
                      alt={`${property.title} thumbnail ${index + 1}`}
                      className="aspect-square h-full w-full object-cover"
                      src={image}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PropertyChatDialog
        onOpenChange={setIsChatOpen}
        open={isChatOpen}
        property={property}
      />
    </main>
  )
}
