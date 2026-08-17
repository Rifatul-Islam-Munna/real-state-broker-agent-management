/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useState } from "react"

import type { PropertyItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { formatCurrencyAmount, formatPriceLabel, parseCurrencyValue } from "@/lib/currency"

type Section2SectionProps = {
  property: PropertyItem
  relatedProperties: PropertyItem[]
}

const fallbackImage = "https://placehold.co/1200x800/e2e8f0/0f172a?text=EstateBlue"

function imageGallery(property: PropertyItem) {
  const images = Array.from(new Set([property.thumbnailUrl, ...property.imageUrls].filter(Boolean) as string[]))
  return images.length ? images : [fallbackImage]
}

function listingImage(property: PropertyItem) {
  return property.thumbnailUrl ?? property.imageUrls[0] ?? fallbackImage
}

function locationParts(property: PropertyItem) {
  return (property.location || property.exactLocation || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function estimateMonthlyPayment(priceLabel: string) {
  const price = parseCurrencyValue(priceLabel)
  if (!price) return formatCurrencyAmount(0)
  const principal = price * 0.8
  const rate = 0.065 / 12
  const months = 30 * 12
  return formatCurrencyAmount((principal * rate * (1 + rate) ** months) / ((1 + rate) ** months - 1))
}

function statusLabel(status: string) {
  return `${status ?? ""}`.replace(/([A-Z])/g, " $1").trim()
}

function amenityIcon(value: string) {
  const text = value.toLowerCase()
  if (text.includes("parking")) return "local_parking"
  if (text.includes("pool")) return "pool"
  if (text.includes("gym")) return "fitness_center"
  if (text.includes("garden")) return "yard"
  if (text.includes("security")) return "security"
  if (text.includes("wifi") || text.includes("smart")) return "wifi"
  if (text.includes("pet")) return "pets"
  if (text.includes("air") || text.includes("climate")) return "ac_unit"
  return "check_circle"
}

export function Section2Section({ property, relatedProperties }: Section2SectionProps) {
  const gallery = imageGallery(property)
  const parts = locationParts(property)
  const city = parts[0] || "Featured Area"
  const agentName = property.agent?.fullName || "Listing Advisor"
  const agentRole = property.agent?.agencyName || "Property Specialist"
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  function openGallery(index: number) {
    setActiveImage(index)
    setGalleryOpen(true)
  }

  function moveGallery(step: number) {
    setActiveImage((current) => (current + step + gallery.length) % gallery.length)
  }

  return (
    <>
      <main className="bg-[#f8f9ff] pb-20">
        <div className="mx-auto max-w-[1440px] px-4 pt-7 sm:px-8 lg:px-10">
          <div className="mb-7 flex items-center justify-between gap-4">
            <nav className="flex min-w-0 flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <Link href="/property-search" className="hover:text-[#4343d5]">Market</Link>
              <span>/</span>
              <span>{city}</span>
              <span>/</span>
              <span className="truncate text-[#0b1c30]">{property.title}</span>
            </nav>
            <div className="flex gap-2">
              <button type="button" aria-label="Share property" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:text-[#4343d5]"><AppIcon name="share" className="text-lg" /></button>
              <button type="button" aria-label="Save property" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:text-[#4343d5]"><AppIcon name="favorite" className="text-lg" /></button>
            </div>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="space-y-7 lg:col-span-8">
              <div className="grid h-[360px] grid-cols-4 grid-rows-2 gap-3 sm:h-[500px]">
                <button type="button" onClick={() => openGallery(0)} className="relative col-span-4 row-span-2 overflow-hidden rounded-xl bg-slate-200 text-left sm:col-span-3">
                  <img src={gallery[0]} alt={property.title} className="h-full w-full object-cover" />
                </button>
                <button type="button" onClick={() => openGallery(Math.min(1, gallery.length - 1))} className="relative hidden overflow-hidden rounded-xl bg-slate-200 sm:block">
                  <img src={gallery[1] || gallery[0]} alt={`${property.title} detail`} className="h-full w-full object-cover" />
                </button>
                <button type="button" onClick={() => openGallery(Math.min(2, gallery.length - 1))} className="relative hidden overflow-hidden rounded-xl bg-slate-200 sm:block">
                  <img src={gallery[2] || gallery[0]} alt={`${property.title} gallery`} className="h-full w-full object-cover brightness-50" />
                  <span className="absolute inset-0 flex flex-col items-center justify-center text-white"><AppIcon name="grid_view" className="text-3xl" /><strong className="mt-1 text-xs">{gallery.length} Photos</strong></span>
                </button>
              </div>

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-[#0b1c30]">{property.title}</h1>
                    <span className="rounded border border-[#4fdbc8]/60 bg-[#71f8e4]/20 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#006b5f]">{statusLabel(property.status)}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600"><AppIcon name="location_on" className="text-lg text-[#4343d5]" />{property.location || property.exactLocation}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-4xl font-black tracking-[-0.04em] text-[#4343d5]">{formatPriceLabel(property.price)}</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">Est. Payment: {estimateMonthlyPayment(property.price)} / Month</p>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-6 text-center">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Bedrooms</p><strong className="mt-1 block text-3xl">{property.bedRoom || "—"}</strong></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Bathrooms</p><strong className="mt-1 block text-3xl">{property.bathRoom || "—"}</strong></div>
                <div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Square Ft</p><strong className="mt-1 block text-3xl">{property.width || "—"}</strong></div>
              </div>

              <section>
                <div className="mb-5 flex items-center gap-3"><h2 className="text-sm font-bold uppercase tracking-[0.14em]">Overview</h2><span className="h-px flex-1 bg-slate-200" /></div>
                <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-slate-600">{property.description || "Property description coming soon."}</p>
              </section>

              <section>
                <div className="mb-5 flex items-center gap-3"><h2 className="text-sm font-bold uppercase tracking-[0.14em]">Property Features</h2><span className="h-px flex-1 bg-slate-200" /></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(property.keyAmenities.length ? property.keyAmenities : ["Feature details coming soon"]).map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-3 text-xs font-semibold"><AppIcon name={amenityIcon(amenity)} className="text-lg text-[#4343d5]" />{amenity}</div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:col-span-4">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_5px_20px_rgba(15,23,42,.04)]">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <img src={property.agent?.avatarUrl || fallbackImage} alt={agentName} className="h-14 w-14 rounded-full object-cover" />
                  <div><h2 className="font-bold">{agentName}</h2><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{agentRole}</p></div>
                </div>

                <div className="mt-5 space-y-4">
                  <div><label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Full Name</label><input readOnly placeholder="Your name" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm placeholder:text-slate-300" /></div>
                  <div><label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Email Address</label><input readOnly placeholder="you@example.com" className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-sm placeholder:text-slate-300" /></div>
                  <div><label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Message</label><textarea readOnly placeholder={`Interested in ${property.title}...`} rows={3} className="mt-1 w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-3 text-sm placeholder:text-slate-300" /></div>
                </div>

                <Link href="/contact-us" className="mt-5 flex w-full items-center justify-center rounded-md bg-[#4343d5] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#3434b8]">Contact Us About This Listing</Link>
                <Link href="/schedule-a-viewing" className="mt-3 flex w-full items-center justify-center rounded-md border border-[#0b1c30] px-5 py-4 text-sm font-bold text-[#0b1c30] transition hover:bg-[#0b1c30] hover:text-white">Schedule Viewing</Link>
                <p className="mt-4 text-center text-[9px] text-slate-500"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-[#006b5f]" />Typical response in 15 minutes</p>
              </div>

              <div className="rounded-xl bg-[#4343d5] p-6 text-white">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Listing Snapshot</p>
                <p className="mt-4 text-3xl font-black">{property.width || "Size N/A"}</p>
                <p className="mt-2 text-sm leading-6 text-white/85">{property.propertyType} · {property.listingType === "ForRent" ? "Available to rent" : "Available for purchase"}</p>
                <Link href="/contact-us" className="mt-5 inline-flex items-center gap-2 border-b border-white/30 pb-2 text-[10px] font-bold uppercase tracking-widest">Request More Information <AppIcon name="arrow_forward" className="text-sm" /></Link>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <section className="border-t border-slate-200 bg-[#eff4ff] py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10">
          <div className="mb-7 flex items-end justify-between gap-4"><h2 className="text-2xl font-extrabold">Similar Properties</h2><Link href="/property-search" className="text-xs font-bold text-[#4343d5]">View All {city} Listings</Link></div>
          {relatedProperties.length ? (
            <div className="grid gap-6 md:grid-cols-3">
              {relatedProperties.slice(0, 3).map((item) => (
                <Link key={item.id} href={`/properties/${item.slug}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-48 overflow-hidden"><img src={listingImage(item)} alt={item.title} className="h-full w-full object-cover" /></div>
                  <div className="p-5"><p className="text-xl font-black text-[#4343d5]">{formatPriceLabel(item.price)}</p><h3 className="mt-1 truncate text-sm font-bold">{item.title}</h3><div className="mt-3 flex gap-4 text-[9px] font-bold uppercase tracking-wider text-slate-500"><span>{item.bedRoom || "—"} Bed</span><span>{item.bathRoom || "—"} Bath</span><span>{item.width || "Size N/A"}</span></div></div>
                </Link>
              ))}
            </div>
          ) : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No similar public properties are available right now.</div>}
        </div>
      </section>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-6xl overflow-hidden bg-slate-950 p-0 text-white" showCloseButton>
          <DialogTitle className="sr-only">{property.title} image gallery</DialogTitle>
          <div className="relative flex min-h-[65vh] items-center justify-center bg-black">
            <img src={gallery[activeImage]} alt={`${property.title} ${activeImage + 1}`} className="max-h-[82vh] w-full object-contain" />
            {gallery.length > 1 ? <><button type="button" onClick={() => moveGallery(-1)} className="absolute left-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><AppIcon name="chevron_left" /></button><button type="button" onClick={() => moveGallery(1)} className="absolute right-4 grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"><AppIcon name="chevron_right" /></button></> : null}
            <span className="absolute left-4 top-4 rounded bg-white/10 px-3 py-2 text-xs font-bold">{activeImage + 1} / {gallery.length}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
