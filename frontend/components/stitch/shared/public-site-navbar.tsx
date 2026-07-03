/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AppIcon } from "@/components/ui/app-icon"
import {
  marketInsightsBlogPageMeta,
  publicContactUsPageMeta,
} from "@/data/page-metadata/public"
import { getSessionUser } from "@/lib/auth-actions"
import { getPortalHomePath } from "@/lib/portal-paths"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

const navItems = [
  {
    href: "/property-search",
    label: "Properties",
  },
  {
    href: "/agents",
    label: "Agents",
  },
  {
    href: marketInsightsBlogPageMeta.routePath,
    label: "Blog",
  },
] as const

export async function PublicPrimaryNavbar() {
  const sessionUser = await getSessionUser()
  const publicAgencySettings = await getPublicAgencySettings()
  const isAuthenticated = Boolean(sessionUser)
  const authHref = sessionUser ? getPortalHomePath(sessionUser) : "/login"
  const authLabel = isAuthenticated ? "Dashboard" : "Sign In"
  const agencyName = publicAgencySettings.profile.agencyName.trim()
  const logoUrl = publicAgencySettings.profile.logo.url

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-8">
          <Link aria-label={agencyName || "Home"} href="/" className="flex min-w-0 items-center gap-2.5 text-foreground">
            {logoUrl ? (
              <img alt={agencyName || "Agency logo"} className="h-9 w-auto max-w-32 object-contain" src={logoUrl} />
            ) : null}
            {agencyName ? (
              <h1 className="truncate text-base font-bold tracking-tight">
                {agencyName}
              </h1>
            ) : null}
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className="rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link
            className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-accent"
            href={authHref}
          >
            {authLabel}
          </Link>
          <Link
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            href={publicContactUsPageMeta.routePath}
          >
            {"Contact Us"}
          </Link>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open navigation"
              className="inline-flex size-10 items-center justify-center rounded-xl border bg-background text-foreground shadow-xs"
            >
              <AppIcon className="text-xl" name="menu" />
            </SheetTrigger>
            <SheetContent
              className="w-[min(22rem,90vw)] border-l bg-background p-0"
              side="right"
            >
              <SheetHeader className="border-b px-5 py-5 text-left">
                <SheetTitle className="sr-only">
                  {"Navigation"}
                </SheetTitle>
                <Link aria-label={agencyName || "Home"} href="/" className="flex items-center gap-2.5 text-foreground">
                  {logoUrl ? (
                    <img alt={agencyName || "Agency logo"} className="h-9 w-auto max-w-32 object-contain" src={logoUrl} />
                  ) : null}
                  {agencyName ? (
                    <span className="text-base font-bold tracking-tight">
                      {agencyName}
                    </span>
                  ) : null}
                </Link>
              </SheetHeader>
              <div className="flex flex-col gap-5 px-5 py-5">
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <SheetClose
                      key={`${item.label}-sheet`}
                      render={
                        <Link
                          className="rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                          href={item.href}
                        />
                      }
                    >
                      {item.label}
                    </SheetClose>
                  ))}
                </nav>
                <div className="flex flex-col gap-2 border-t pt-5">
                  <SheetClose
                    render={
                      <Link
                        className="rounded-xl border px-4 py-3 text-center text-sm font-semibold text-foreground"
                        href={authHref}
                      />
                    }
                  >
                    {authLabel}
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                        href={publicContactUsPageMeta.routePath}
                      />
                    }
                  >
                    {"Contact Us"}
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
