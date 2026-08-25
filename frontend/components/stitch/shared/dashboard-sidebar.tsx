"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Building2, ChevronsUpDown, LayoutDashboard } from "lucide-react"

import { PropertyOperationsSidebar } from "@/components/stitch/pages/property-operations/property-operations-sidebar"
import { NavUser } from "@/components/nav-user"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/sidebar"
import { getDashboardRoutesForUser, type DashboardRoute } from "@/lib/dashboard-routes"
import { useLogoutMutation } from "@/hooks/use-auth"

const routeGroups = [
  { label: "General", hrefs: ["/dashboard", "/dashboard/reports"] },
  { label: "Listings", hrefs: ["/dashboard/properties", "/dashboard/property-chat-inbox"] },
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
      "/dashboard/showing-requests",
      "/dashboard/realtor-showings",
      "/dashboard/owner-reports",
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
    label: "AI Chatbot",
    hrefs: ["/dashboard/chatbot-settings", "/dashboard/test-chatbot"],
  },
  {
    label: "Tools",
    hrefs: [
      "/dashboard/homepage",
      "/dashboard/blog",
      "/dashboard/marketing",
      "/dashboard/documents",
      "/dashboard/pdfs",
      "/dashboard/tools",
    ],
  },
  { label: "Support", hrefs: ["/dashboard/deals", "/dashboard/team", "/dashboard/settings"] },
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
  const router = useRouter()
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
    <Sidebar className="dashboard-sidebar bg-white text-[var(--ether-on-surface)]" collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="bg-white p-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left outline-none transition hover:bg-[var(--ether-surface-container-low)] data-popup-open:bg-[var(--ether-surface-container)]">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--ether-primary-container)] text-white">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={agencyName} className="h-full w-full object-contain" src={logoUrl} />
              ) : (
                <Building2 className="size-5" />
              )}
            </span>
            <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="block truncate text-sm font-semibold text-[var(--ether-on-surface)]">{agencyName}</span>
              <span className="block text-[11px] text-[var(--ether-outline)]">Workspace</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-[var(--ether-outline)] group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[228px] rounded-xl border border-[var(--ether-outline-variant)] bg-white p-1.5 text-[var(--ether-on-surface)] shadow-xl" side="right" sideOffset={8}>
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--ether-outline)]">
              Dashboards
            </DropdownMenuLabel>
            <DropdownMenuItem className="gap-3 rounded-lg px-2.5 py-2.5 focus:bg-[var(--ether-surface-container-low)]" onClick={() => router.push(homeHref)}>
              <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] bg-white">
                <LayoutDashboard className="size-4 text-[var(--ether-on-surface-variant)]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Main dashboard</span>
                <span className="block text-xs text-[var(--ether-outline)]">Sales and agency CRM</span>
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 bg-[var(--ether-sidebar-border)]" />
            <DropdownMenuItem className="gap-3 rounded-lg px-2.5 py-2.5 focus:bg-[var(--ether-surface-container-low)]" onClick={() => router.push("/dashboard/property-operations")}>
              <span className="flex size-8 items-center justify-center rounded-lg border border-[var(--ether-outline-variant)] bg-white">
                <Building2 className="size-4 text-[var(--ether-on-surface-variant)]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">Property management</span>
                <span className="block text-xs text-[var(--ether-outline)]">Operations dashboard</span>
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="bg-white py-2 text-[var(--ether-on-surface-variant)]">
        <ScrollArea className="min-h-0 flex-1">
          <nav aria-label="Dashboard" className="pb-3">
            {navigation.length === 0 ? (
              <SidebarGroup>
                <SidebarGroupContent>
                  <Alert>
                    <AlertDescription>No dashboard routes are assigned yet. Ask an admin to grant access.</AlertDescription>
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
                  <SidebarGroup
                    className="px-3 py-3"
                    key={group.label}
                  >
                    <SidebarGroupLabel className="mb-1 h-auto px-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--ether-outline)]">
                      {group.label}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu className="gap-1">
                        {items.map((item) => {
                          const hrefPath = item.href.split("#")[0]
                          const isActive = hrefPath === activeHref

                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton
                                className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-[var(--ether-on-surface-variant)] transition-colors hover:bg-[var(--ether-surface-container-low)] hover:text-[var(--ether-on-surface)] data-active:bg-[var(--ether-surface-container)] data-active:text-[var(--ether-on-surface)] [&>svg]:size-4 [&>svg]:text-[var(--ether-on-surface-variant)]"
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

      <SidebarFooter className="bg-white p-3">
        <div className="rounded-xl bg-[var(--ether-surface-container-low)] p-1">
          <NavUser
            user={{ name: userName, email, avatar: avatarUrl ?? "", role }}
            onLogout={() => logout()}
            isLoggingOut={isPending}
          />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}


