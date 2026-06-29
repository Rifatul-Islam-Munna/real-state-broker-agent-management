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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { getDashboardRoutesForUser } from "@/lib/dashboard-routes"

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
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="border-b border-white/10 bg-primary p-4 text-white">
        <PortalBrandLink
          agencyName={agencyName}
          href={homeHref}
          iconWrapperClassName="bg-white/95 p-2"
          logoUrl={logoUrl}
          nameClassName="text-white"
        />
      </SidebarHeader>

      <SidebarContent className="bg-primary text-white">
        <ScrollArea className="min-h-0 flex-1">
          <SidebarGroup className="p-4">
            <SidebarGroupLabel className="px-2 text-white/60">
              {"Workspace"}
            </SidebarGroupLabel>
            <SidebarSeparator className="mb-2 bg-white/10" />
            <SidebarGroupContent>
        <nav aria-label="Dashboard">
          {navigation.length === 0 ? (
            <Alert className="border-white/10 bg-white/10 text-white">
              <AlertDescription className="text-white/75">
                {"No dashboard routes are assigned yet. Ask an admin to grant access."}
              </AlertDescription>
            </Alert>
          ) : (
            <SidebarMenu className="gap-2">
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      className="h-11 rounded-2xl px-4 text-white/80 hover:bg-white/10 hover:text-white data-active:bg-white data-active:text-primary"
                      isActive={isActive}
                      render={<Link href={item.href} />}
                      tooltip={item.label}
                    >
                      <AppIcon name={item.icon} />
                      <span className="font-semibold">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          )}
        </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  )
}
