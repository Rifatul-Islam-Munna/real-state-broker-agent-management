"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type PublicNavItem = {
  href: string
  label: string
}

export function PublicNavLinks({ items, mobile = false }: { items: readonly PublicNavItem[]; mobile?: boolean }) {
  const pathname = usePathname()

  return (
    <nav className={mobile ? "flex flex-col gap-2" : "hidden items-center gap-8 md:flex"}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              mobile
                ? "rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
                : "border-b-2 py-5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors",
              active
                ? mobile
                  ? "bg-primary/10 text-primary"
                  : "border-primary text-primary"
                : mobile
                  ? "text-slate-700 hover:bg-slate-100"
                  : "border-transparent text-slate-600 hover:text-primary",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
