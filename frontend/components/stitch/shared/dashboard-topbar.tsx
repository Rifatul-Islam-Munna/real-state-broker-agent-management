"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { dashboardRoutes } from "@/lib/dashboard-routes"

type DashboardTopbarProps = {
  userName: string
  role: string
  avatarUrl?: string | null
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U"
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
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="flex min-h-18 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <SidebarTrigger className="shadow-xs" size="icon-sm" variant="outline" />
        <div className="min-w-0 flex-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/dashboard" />}>
                  {"Dashboard"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {currentRoute?.href !== "/dashboard" ? (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <Badge variant={role === "Admin" ? "default" : "secondary"}>
            {role}
          </Badge>
          <Separator orientation="vertical" className="h-9" />
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shadow-sm ring-2 ring-background">
              {avatarUrl ? <AvatarImage alt={userName} src={avatarUrl} /> : null}
              <AvatarFallback>{initialsFromName(userName)}</AvatarFallback>
            </Avatar>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{"Workspace access"}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
