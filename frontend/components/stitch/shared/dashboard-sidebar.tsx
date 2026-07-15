"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PropertyOperationsSidebar } from "@/components/stitch/pages/property-operations/property-operations-sidebar"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { getDashboardRoutesForUser, type DashboardRoute } from "@/lib/dashboard-routes"

const routeGroups = [
  {
    label: "Overview",
    hrefs: ["/dashboard", "/dashboard/reports"],
  },
  {
    label: "Listings",
    hrefs: ["/dashboard/properties", "/dashboard/property-chat-inbox"],
  },
  {
    label: "Leads",
    hrefs: [
      "/dashboard/leads",
      "/dashboard/lead-history",
      "/dashboard/lead-schedule",
      "/dashboard/lead-collection-templates",
      "/dashboard/contact-inbox",
      "/dashboard/text-messages",
      "/dashboard/mail",
    ],
  },
  {
    label: "Realtors",
    hrefs: [
      "/dashboard/realtor-showings",
      "/dashboard/realtor-showings/sequences",
      "/dashboard/showing-feedback",
      "/dashboard/showing-feedback/leads",
      "/dashboard/showing-feedback/leads/sequences",
      "/dashboard/showing-feedback/leads/classifier-controls",
      "/dashboard/showing-feedback-automation",
    ],
  },
  {
    label: "Content",
    hrefs: ["/dashboard/homepage", "/dashboard/blog", "/dashboard/marketing", "/dashboard/documents", "/dashboard/pdfs"],
  },
  {
    label: "Tools",
    hrefs: ["/dashboard/tools"],
  },
  {
    label: "Business",
    hrefs: ["/dashboard/deals", "/dashboard/team", "/dashboard/settings"],
  },
] as const

type DashboardSidebarProps = {
  agencyName: string
  logoUrl?: string
  role: string
  agentRoutePermissions?: string[]
}

export function DashboardSidebar({
  agencyName,
  logoUrl,
  role,
  agentRoutePermissions,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const navigation = getDashboardRoutesForUser(role, agentRoutePermissions)
  const homeHref = navigation[0]?.href ?? "/dashboard"
  const activeHref =
    navigation
      .filter((item) => !item.href.includes("#"))
      .map((item) => item.href.split("#")[0])
      .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
      .sort((a, b) => b.length - a.length)[0] ?? ""

  if (pathname.startsWith("/dashboard/property-operations")) {
    return (
      <PropertyOperationsSidebar
        agencyName={agencyName}
        logoUrl={logoUrl}
        role={role}
      />
    )
  }

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border/80 p-4">
        <PortalBrandLink
          agencyName={agencyName}
          className="min-w-0 text-sidebar-foreground"
          href={homeHref}
          iconWrapperClassName="bg-sidebar-primary p-2 text-sidebar-primary-foreground shadow-sm"
          logoUrl={logoUrl}
          nameClassName="text-sidebar-foreground font-bold tracking-tight group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent className="py-2">
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Dashboard">
            {navigation.length === 0 ? (
              <SidebarGroup>
                <SidebarGroupContent>
                  <Alert>
                    <AlertDescription>
                      {"No dashboard routes are assigned yet. Ask an admin to grant access."}
                    </AlertDescription>
                  </Alert>
                </SidebarGroupContent>
              </SidebarGroup>
            ) : (
              routeGroups.map((group) => {
                const items = group.hrefs
                  .map((href) => navigation.find((item) => item.href === href))
                  .filter((item): item is DashboardRoute => Boolean(item))

                if (items.length === 0) return null

                return (
                  <SidebarGroup className="px-3 py-2" key={group.label}>
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarSeparator className="mx-2 opacity-60" />
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-1">
                        {items.map((item) => {
                          const hrefPath = item.href.split("#")[0]
                          const isActive = hrefPath === activeHref

                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                className="h-10 rounded-xl px-3 font-medium"
                                isActive={isActive}
                                render={<Link href={item.href} />}
                                tooltip={item.label}
                              >
                                <AppIcon name={item.icon} />
                                <span>{item.label}</span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )
              })
            )}
          </nav>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="h-10 rounded-xl px-3" tooltip={role}>
                  <AppIcon name={role === "Admin" ? "verified" : "badge"} />
                  <span>{role}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
