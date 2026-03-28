"use client"

import Link from "next/link"
import { useState } from "react"

import type { PublicAgencyProfileSettings } from "@/@types/real-estate-api"
import { useCreateMailInboxItem } from "@/hooks/use-real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { agencySocialPlatformOptions, getConfiguredAgencySocialLinks } from "@/lib/agency-social-links"

export function NewsletterFooterSection({
  profile,
}: {
  profile: PublicAgencyProfileSettings
}) {
  const createMailInboxItem = useCreateMailInboxItem()
  const [email, setEmail] = useState("")
  const [joined, setJoined] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const configuredSocialLinks = getConfiguredAgencySocialLinks(profile.socialLinks)
  const locationLabels = profile.officeLocations.filter((item) => item.trim().length > 0)
  const agencyLabel = profile.agencyName.trim() || "our team"

  return (
    <footer className="bg-primary pt-20 pb-10 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-8">
              {profile.logo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={profile.agencyName || "Agency logo"} className="h-12 w-auto max-w-28 object-contain" src={profile.logo.url} />
              ) : null}
              {profile.agencyName ? (
                <span className="text-2xl font-black tracking-tight uppercase">
                  {profile.agencyName}
                </span>
              ) : null}
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              {`Connect with ${agencyLabel} for active listings, private tours, and market guidance tailored to your timeline.`}
            </p>
            <div className="flex gap-4">
              {configuredSocialLinks.length > 0 ? configuredSocialLinks.map((link) => {
                const platform = agencySocialPlatformOptions.find((item) => item.platform === link.platform)

                return (
                  <a
                    key={link.platform}
                    aria-label={platform?.label ?? link.platform}
                    className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-accent transition-colors"
                    href={link.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <AppIcon className="text-sm" name={platform?.icon ?? "share"} />
                  </a>
                )
              }) : profile.contactEmail ? (
                <a className="w-10 h-10 border border-white/20 flex items-center justify-center text-white/50" href={`mailto:${profile.contactEmail}`}>
                  <AppIcon className="text-sm" name="mail" />
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Quick Links"}
            </h5>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              <li><Link className="hover:text-white transition-colors" href="/property-search">{"Find a Property"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/profile/seller/list-your-property">{"Sell Your Home"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/profile/buyer/wishlist">{"Buyer Profile"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/admin">{"Agent Portal"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/blog">{"Blog"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/agents">{"Our Agents"}</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/contact-us">{"Contact Us"}</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Locations"}
            </h5>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              {locationLabels.length > 0 ? locationLabels.map((location) => (
                <li key={location}>
                  <span className="transition-colors hover:text-white">{location}</span>
                </li>
              )) : (
                <li>
                  <span className="text-white/50">{"No office locations added yet."}</span>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Newsletter"}
            </h5>
            <p className="text-sm text-white/60 mb-6">
              {"Receive exclusive listings and market reports monthly."}
            </p>
            <form
              className="flex"
              onSubmit={async (event) => {
                event.preventDefault()

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                  setJoinError("Enter a valid email address.")
                  return
                }

                setJoinError(null)

                const response = await createMailInboxItem.mutateAsync({
                  email,
                  kind: "Newsletter",
                  message: `Joined the ${agencyLabel} newsletter from the homepage footer.`,
                  name: "",
                  subject: "Newsletter signup",
                })

                if (response.error) {
                  setJoinError(response.error.message)
                  return
                }

                setEmail("")
                setJoined(true)
              }}
            >
              <Input
                className="h-auto rounded-none border-none bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/55 focus-visible:ring-accent/50"
                onChange={(event) => {
                  setJoinError(null)
                  setJoined(false)
                  setEmail(event.target.value)
                }}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <button className="bg-accent px-6 py-3 font-bold uppercase text-[10px] disabled:cursor-not-allowed disabled:opacity-70" disabled={createMailInboxItem.isPending} type="submit">
                {createMailInboxItem.isPending ? "..." : "Join"}
              </button>
            </form>
            {joinError ? (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-300">
                {joinError}
              </p>
            ) : null}
            {joined ? (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {"Saved to admin mail inbox"}
              </p>
            ) : null}
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:row justify-between items-center gap-6">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            {` 2026 ${profile.agencyName.trim() || "Real Estate Agency"}. All rights reserved.`}
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/40">
            <a className="hover:text-white" href="#">{"Privacy Policy"}</a>
            <a className="hover:text-white" href="#">{"Terms of Service"}</a>
            <a className="hover:text-white" href="#">{"Cookie Settings"}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
