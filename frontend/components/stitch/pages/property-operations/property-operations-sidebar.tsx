"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { NavUser } from "@/components/nav-user"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
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
import { propertyOperationsModules } from "@/data/property-operations-modules"
import { useLogoutMutation } from "@/hooks/use-auth"

const workspaceItems = [
  { href: "/dashboard/property-operations?tab=overview", label: "Overview", icon: "dashboard", tab: "overview" },
  { href: "/dashboard/property-operations?tab=modules", label: "All operations", icon: "apartment", tab: "modules" },
  { href: "/dashboard/property-operations?tab=requests", label: "Links and QR forms", icon: "link", tab: "requests" },
  { href: "/dashboard/property-operations?tab=settings", label: "Settings", icon: "settings", tab: "settings" },
] as const

const categoryIcons: Record<string, string> = {
  Portfolio: "domain",
  People: "group",
  Maintenance: "work",
  Finance: "payments",
  Communication: "forum",
  Documents: "description",
  Portals: "public",
  Administration: "verified",
  Insights: "analytics",
}

export function PropertyOperationsSidebar({
  avatarUrl,
  email,
  logoUrl,
  role,
  userName,
}: {
  agencyName: string
  avatarUrl?: string | null
  email: string
  logoUrl?: string
  role: string
  userName: string
}) {
  const searchParams = useSearchParams()
  const { mutate: logout, isPending } = useLogoutMutation()
  const currentTab = searchParams.get("tab") ?? "overview"
  const currentModule = searchParams.get("module")
  const categories = Array.from(new Set(propertyOperationsModules.map((module) => module.category)))

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border/80 p-4">
        <PortalBrandLink
          agencyName="Property Operations"
          className="min-w-0 text-sidebar-foreground"
          href="/dashboard/property-operations?tab=overview"
          iconWrapperClassName="bg-sidebar-primary p-2 text-sidebar-primary-foreground shadow-sm"
          logoUrl={logoUrl}
          nameClassName="font-bold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent className="py-2">
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Property Operations">
            <SidebarGroup className="px-3 py-2">
              <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                Workspace
              </SidebarGroupLabel>
              <SidebarSeparator className="mx-2 opacity-60" />
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
                  {workspaceItems.map((item) => (
                    <SidebarMenuItem key={item.tab}>
                      <SidebarMenuButton
                        className="h-10 rounded-xl px-3 font-medium"
                        isActive={currentTab === item.tab && !currentModule}
                        render={<Link href={item.href} />}
                        tooltip={item.label}
                      >
                        <AppIcon name={item.icon} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {categories.map((category) => {
              const modules = propertyOperationsModules.filter((module) => module.category === category)
              return (
                <SidebarGroup className="px-3 py-2" key={category}>
                  <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">
                    {category}
                  </SidebarGroupLabel>
                  <SidebarSeparator className="mx-2 opacity-60" />
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {modules.map((module) => {
                        const label = module.id === "subscriptions" ? "Service Contracts & Utilities" : module.label
                        return (
                          <SidebarMenuItem key={module.id}>
                            <SidebarMenuButton
                              className="h-10 rounded-xl px-3 font-medium"
                              isActive={currentTab === "modules" && currentModule === module.id}
                              render={<Link href={`/dashboard/property-operations?tab=modules&module=${module.id}`} />}
                              tooltip={label}
                            >
                              <AppIcon name={categoryIcons[category] ?? "apartment"} />
                              <span>{label}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              )
            })}
          </nav>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10 rounded-xl px-3"
              render={<Link href="/dashboard" />}
              tooltip="Back to main dashboard"
            >
              <AppIcon name="arrow_back" />
              <span>Back to main dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          user={{ name: userName, email, avatar: avatarUrl ?? "", role }}
          onLogout={() => logout()}
          isLoggingOut={isPending}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
