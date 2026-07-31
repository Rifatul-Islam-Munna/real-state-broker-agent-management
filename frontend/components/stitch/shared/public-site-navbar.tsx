/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { PublicNavLinks } from "@/components/stitch/shared/public-nav-links"
import { AppIcon } from "@/components/ui/app-icon"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  marketInsightsBlogPageMeta,
  publicContactUsPageMeta,
} from "@/data/page-metadata/public"
import { getSessionUser } from "@/lib/auth-actions"
import { getPortalHomePath } from "@/lib/portal-paths"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

const navItems = [
  { href: "/property-search", label: "Properties" },
  { href: "/agents", label: "Agents" },
  { href: marketInsightsBlogPageMeta.routePath, label: "Blog" },
] as const

function BrandName({ agencyName }: { agencyName: string }) {
  const [firstWord, ...rest] = agencyName.split(/\s+/)
  const remainingName = rest.join(" ")

  return (
    <span className="truncate text-xl font-extrabold tracking-[-0.035em] text-primary">
      {firstWord}
      {remainingName ? <span className="ml-1 font-light text-slate-600">{remainingName}</span> : null}
    </span>
  )
}

export async function PublicPrimaryNavbar() {
  const sessionUser = await getSessionUser()
  const publicAgencySettings = await getPublicAgencySettings()
  const authHref = sessionUser ? getPortalHomePath(sessionUser) : "/login"
  const authLabel = sessionUser ? "Dashboard" : "Sign In"
  const agencyName = publicAgencySettings.profile.agencyName.trim() || "Ether Real Estate"
  const logoUrl = publicAgencySettings.profile.logo.url

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-8 lg:gap-10">
          <Link aria-label={agencyName} href="/" className="flex min-w-0 items-center gap-2.5">
            {logoUrl ? <img alt={agencyName} className="h-9 w-auto max-w-32 object-contain" src={logoUrl} /> : null}
            {!logoUrl ? <BrandName agencyName={agencyName} /> : null}
          </Link>
          <PublicNavLinks items={navItems} />
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            className="rounded border border-primary/20 bg-white px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/5"
            href={authHref}
          >
            {authLabel}
          </Link>
          <Link
            className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 active:scale-95"
            href={publicContactUsPageMeta.routePath}
          >
            Contact Us
          </Link>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open navigation"
              className="inline-flex size-10 items-center justify-center rounded border border-slate-200 bg-white text-slate-700"
            >
              <AppIcon className="text-xl" name="menu" />
            </SheetTrigger>
            <SheetContent className="w-[min(22rem,90vw)] border-l bg-white p-0" side="right">
              <SheetHeader className="border-b px-5 py-5 text-left">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <Link aria-label={agencyName} href="/" className="flex items-center gap-2.5">
                  {logoUrl ? <img alt={agencyName} className="h-9 w-auto max-w-32 object-contain" src={logoUrl} /> : null}
                  {!logoUrl ? <BrandName agencyName={agencyName} /> : null}
                </Link>
              </SheetHeader>

              <div className="flex flex-col gap-5 px-5 py-5">
                <PublicNavLinks items={navItems} mobile />
                <div className="flex flex-col gap-2 border-t pt-5">
                  <SheetClose
                    render={<Link className="rounded border border-primary/20 px-4 py-3 text-center text-sm font-semibold text-primary" href={authHref} />}
                  >
                    {authLabel}
                  </SheetClose>
                  <SheetClose
                    render={<Link className="rounded bg-primary px-4 py-3 text-center text-sm font-semibold text-white" href={publicContactUsPageMeta.routePath} />}
                  >
                    Contact Us
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
