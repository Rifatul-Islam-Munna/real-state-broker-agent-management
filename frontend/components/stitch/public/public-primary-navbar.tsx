import Link from "next/link"

import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { publicContactUsPageMeta } from "@/static-data/pages/public-contact-us/meta"
import { sellerListYourPropertyPageMeta } from "@/static-data/pages/seller-list-your-property/meta"
import { AppIcon } from "@/components/ui/app-icon"

const navItems = [
  {
    href: "/property-search",
    label: "Buy",
  },
  {
    href: "/property-search",
    label: "Rent",
  },
  {
    href: sellerListYourPropertyPageMeta.routePath,
    label: "Sell",
  },
  {
    href: "/agents",
    label: "Agents",
  },
] as const

export function PublicPrimaryNavbar() {
  return (
    <header className="border-b border-primary/10 bg-white px-4 py-4 md:px-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-primary">
            <AppIcon className="text-3xl" name="domain" />
            <h1 className="text-xl font-800 tracking-tighter uppercase">
              {"EstateBlue"}
            </h1>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className="text-sm font-semibold transition-colors hover:text-primary"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <Link
            className="border-2 border-primary px-4 py-2 text-sm font-bold text-primary"
            href="/admin"
          >
            {"Sign In"}
          </Link>
          <Link
            className="bg-primary px-6 py-2 text-sm font-bold text-white"
            href={publicContactUsPageMeta.routePath}
          >
            {"Contact Us"}
          </Link>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger
              aria-label="Open navigation"
              className="inline-flex size-11 items-center justify-center rounded-xl border-2 border-primary text-primary"
            >
              <AppIcon className="text-2xl" name="menu" />
            </SheetTrigger>
            <SheetContent
              className="w-[min(22rem,88vw)] border-l border-primary/10 bg-white p-0"
              side="right"
            >
              <SheetHeader className="border-b border-primary/10 px-6 py-5 text-left">
                <SheetTitle className="sr-only">
                  {"Navigation"}
                </SheetTitle>
                <Link href="/" className="flex items-center gap-2 text-primary">
                  <AppIcon className="text-3xl" name="domain" />
                  <span className="text-xl font-800 tracking-tighter uppercase">
                    {"EstateBlue"}
                  </span>
                </Link>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-6 py-6">
                <nav className="flex flex-col gap-3">
                  {navItems.map((item) => (
                    <SheetClose
                      key={`${item.label}-sheet`}
                      render={
                        <Link
                          className="rounded-xl border border-primary/10 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary hover:text-primary"
                          href={item.href}
                        />
                      }
                    >
                      {item.label}
                    </SheetClose>
                  ))}
                </nav>
                <div className="flex flex-col gap-3">
                  <SheetClose
                    render={
                      <Link
                        className="border-2 border-primary px-4 py-3 text-center text-sm font-bold text-primary"
                        href="/admin"
                      />
                    }
                  >
                    {"Sign In"}
                  </SheetClose>
                  <SheetClose
                    render={
                      <Link
                        className="bg-primary px-6 py-3 text-center text-sm font-bold text-white"
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
