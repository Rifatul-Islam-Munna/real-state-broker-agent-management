"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

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
      "/dashboard/contact-inbox",
      "/dashboard/text-messages",
      "/dashboard/mail",
    ],
  },
  {
    label: "Realtors",
    hrefs: ["/dashboard/realtor-showings"],
  },
  {
    label: "Content",
    hrefs: ["/dashboard/homepage", "/dashboard/blog", "/dashboard/marketing", "/dashboard/documents"],
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

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <PortalBrandLink
          agencyName={agencyName}
          className="min-w-0 text-sidebar-foreground"
          href={homeHref}
          iconWrapperClassName="bg-sidebar-accent p-2 text-sidebar-accent-foreground"
          logoUrl={logoUrl}
          nameClassName="text-sidebar-foreground group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent>
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
                  <SidebarGroup key={group.label}>
                    <SidebarGroupLabel>
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarSeparator />
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((item) => {
                          const isActive =
                            pathname === item.href || pathname.startsWith(`${item.href}/`)

                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
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
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={role}>
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
