"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PropertyOperationsSidebar } from "@/components/stitch/pages/property-operations/property-operations-sidebar"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { NavUser } from "@/components/nav-user"
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
import { useLogoutMutation } from "@/hooks/use-auth"

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
      "/dashboard/replies",
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
      "/dashboard/realtors",
      "/dashboard/realtor-showings/sequences",
      "/dashboard/showing-feedback",
      "/dashboard/showing-feedback-automation",
    ],
  },
  {
    label: "Lead Feedback",
    hrefs: [
      "/dashboard/showing-feedback/leads",
      "/dashboard/showing-feedback/leads/sequences",
      "/dashboard/showing-feedback/leads/classifier-controls",
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
  avatarUrl?: string | null
  email: string
  logoUrl?: string
  role: string
  userName: string
  agentRoutePermissions?: string[]
}

export function DashboardSidebar({
  agencyName,
  avatarUrl,
  email,
  logoUrl,
  role,
  userName,
  agentRoutePermissions,
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const { mutate: logout, isPending } = useLogoutMutation()
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
        avatarUrl={avatarUrl}
        email={email}
        logoUrl={logoUrl}
        role={role}
        userName={userName}
      />
    )
  }

  return (
    <Sidebar
      className="dashboard-sidebar bg-slate-950 text-slate-100"
      collapsible="offcanvas"
      variant="sidebar"
    >
      <SidebarHeader className="border-b border-white/10 bg-slate-950 p-4 text-slate-100">
        <PortalBrandLink
          agencyName={agencyName}
          className="min-w-0 text-white"
          href={homeHref}
          iconWrapperClassName="bg-blue-500 p-2 text-white shadow-sm"
          logoUrl={logoUrl}
          nameClassName="font-bold tracking-tight text-white group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent className="bg-slate-950 py-2 text-slate-100">
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
                  <SidebarGroup className="px-3 py-2 text-slate-100" key={group.label}>
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarSeparator className="mx-2 bg-white/10 opacity-100" />
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-1">
                        {items.map((item) => {
                          const hrefPath = item.href.split("#")[0]
                          const isActive = hrefPath === activeHref

                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                className="h-10 rounded-xl px-3 font-medium text-slate-200 hover:bg-white/10 hover:text-white data-active:bg-blue-500/20 data-active:text-white [&>svg]:text-slate-400 hover:[&>svg]:text-white data-active:[&>svg]:text-blue-200"
                                isActive={isActive}
                                render={<Link href={item.href} />}
                                tooltip={item.label}
                              >
                                <AppIcon name={item.icon} />
                                <span className="!text-slate-200">{item.label}</span>
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
      <SidebarFooter className="border-t border-white/10 bg-slate-950 p-3 text-slate-100">
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
