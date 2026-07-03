"use client"

import Link from "next/link"
import { useState } from "react"

import type { PublicAgencyProfileSettings } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCreateMailInboxItem } from "@/hooks/use-real-estate-api"
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
    <footer className="border-t bg-slate-950 py-12 text-white sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              {profile.logo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={profile.agencyName || "Agency logo"}
                  className="h-11 w-auto max-w-32 object-contain"
                  src={profile.logo.url}
                />
              ) : null}
              {profile.agencyName ? (
                <span className="text-xl font-bold tracking-tight">{profile.agencyName}</span>
              ) : null}
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
              {`Connect with ${agencyLabel} for active listings, private tours, and market guidance tailored to your timeline.`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {configuredSocialLinks.length > 0 ? (
                configuredSocialLinks.map((link) => {
                  const platform = agencySocialPlatformOptions.find(
                    (item) => item.platform === link.platform,
                  )

                  return (
                    <a
                      aria-label={platform?.label ?? link.platform}
                      className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      href={link.url}
                      key={link.platform}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <AppIcon name={platform?.icon ?? "share"} />
                    </a>
                  )
                })
              ) : profile.contactEmail ? (
                <a
                  className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80"
                  href={`mailto:${profile.contactEmail}`}
                >
                  <AppIcon name="mail" />
                </a>
              ) : null}
            </div>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {"Quick links"}
            </h5>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              <li><Link className="transition-colors hover:text-white" href="/property-search">{"Find a property"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/profile/seller/list-your-property">{"Sell your home"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/profile/buyer/wishlist">{"Buyer profile"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/dashboard">{"Dashboard"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/blog">{"Blog"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/agents">{"Our agents"}</Link></li>
              <li><Link className="transition-colors hover:text-white" href="/contact-us">{"Contact us"}</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {"Locations"}
            </h5>
            <ul className="mt-5 space-y-3 text-sm text-white/70">
              {locationLabels.length > 0 ? (
                locationLabels.map((location) => <li key={location}>{location}</li>)
              ) : (
                <li className="text-white/45">{"No office locations added yet."}</li>
              )}
            </ul>
          </div>

          <div>
            <h5 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
              {"Newsletter"}
            </h5>
            <p className="mt-5 text-sm leading-6 text-white/60">
              {"Receive exclusive listings and market reports monthly."}
            </p>
            <form
              className="mt-5 flex gap-2"
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
                className="border-white/15 bg-white/10 text-white placeholder:text-white/45 focus-visible:border-white/35 focus-visible:ring-white/10"
                onChange={(event) => {
                  setJoinError(null)
                  setJoined(false)
                  setEmail(event.target.value)
                }}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <Button disabled={createMailInboxItem.isPending} type="submit">
                {createMailInboxItem.isPending ? "Joining..." : "Join"}
              </Button>
            </form>
            {joinError ? (
              <Alert className="mt-3 border-rose-400/25 bg-rose-400/10 text-rose-200" variant="destructive">
                <AlertDescription className="text-rose-200">{joinError}</AlertDescription>
              </Alert>
            ) : null}
            {joined ? (
              <Alert className="mt-3 border-emerald-400/25 bg-emerald-400/10 text-emerald-200">
                <AlertDescription className="text-emerald-200">
                  {"Saved to the admin mail inbox."}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>{`© 2026 ${profile.agencyName.trim() || "Real Estate Agency"}. All rights reserved.`}</p>
          <p>{profile.contactEmail || profile.contactPhone || "Professional real estate services"}</p>
        </div>
      </div>
    </footer>
  )
}
