"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Gift, Plus, Search } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { dashboardRoutes } from "@/lib/dashboard-routes"

type DashboardTopbarProps = {
  userName: string
  role: string
  avatarUrl?: string | null
}

function initialsFromName(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  )
}

function routeForPath(pathname: string) {
  return [...dashboardRoutes]
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => pathname === route.href || pathname.startsWith(`${route.href}/`))
}

export function DashboardTopbar({ userName, role, avatarUrl }: DashboardTopbarProps) {
  const pathname = usePathname()
  const currentRoute = routeForPath(pathname)
  const title = currentRoute?.label ?? "Dashboard"

  return (
    <header className="sticky top-0 z-30 bg-white/95 shadow-[0_1px_12px_rgba(11,28,48,0.04)] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-4 px-5 lg:px-7">
        <SidebarTrigger className="h-8 w-8 rounded-lg border-[var(--ether-sidebar-border)] text-[var(--ether-outline)] shadow-none" size="icon-sm" variant="outline" />

        <div className="relative w-full max-w-[285px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--ether-outline)]" />
          <input
            aria-label="Search dashboard"
            className="h-9 w-full rounded-lg border border-[#e1e5eb] bg-white pl-9 pr-14 text-sm text-[var(--ether-on-surface)] outline-none transition placeholder:text-[var(--ether-outline)] focus:border-[#cfd4dc] focus:ring-2 focus:ring-[var(--ether-primary-container)]/10"
            placeholder="Search"
            type="search"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--ether-outline)]">⌘ + F</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button className="h-8 w-8 rounded-lg text-[var(--ether-outline)]" size="icon-sm" variant="ghost" aria-label="Rewards">
            <Gift className="size-4" />
          </Button>
          <Button className="h-8 w-8 rounded-lg text-[var(--ether-outline)]" size="icon-sm" variant="ghost" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Button className="h-8 w-8 rounded-lg text-[var(--ether-outline)]" size="icon-sm" variant="ghost" aria-label="Create new">
            <Plus className="size-4" />
          </Button>

          <div className="mx-2 h-7 w-px bg-[var(--ether-sidebar-border)]" />

          <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-[var(--ether-surface-container-low)]">
            <Avatar className="size-8 border border-[var(--ether-sidebar-border)]">
              {avatarUrl ? <AvatarImage alt={userName} src={avatarUrl} /> : null}
              <AvatarFallback className="bg-[#f1efff] text-xs font-semibold text-[var(--ether-primary-container)]">
                {initialsFromName(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 text-left lg:block">
              <p className="max-w-[150px] truncate text-xs font-semibold leading-4 text-[var(--ether-on-surface)]">{userName}</p>
              <p className="text-[11px] leading-4 text-[var(--ether-outline)]">{role}</p>
            </div>
          </Link>
        </div>
      </div>
      <div className="sr-only">{title}</div>
    </header>
  )
}

