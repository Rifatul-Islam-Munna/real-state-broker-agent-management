// @ts-nocheck
"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  BotIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CommandIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  FileChartColumnIcon,
  FileTextIcon,
  HomeIcon,
  LayoutDashboardIcon,
  RepeatIcon,
  RouteIcon,
  Settings2Icon,
  ShieldIcon,
  TicketIcon,
  UsersIcon,
  WrenchIcon,
} from "lucide-react"
import { useLogoutMutation, useMeQuery } from "@/hooks/use-auth"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function buildNav(role: string | undefined, pathname: string) {
  const isPathActive = (target: string) =>
    pathname === target || pathname.startsWith(`${target}/`)

  if (role === "tenant_owner" || role === "admin") {
    return {
      brand: "Property Operations",
      navMain: [
        {
          label: "Overview",
          items: [
            { title: "Overview", url: "/dashboard/property-operations", icon: <LayoutDashboardIcon /> },
          ],
        },
        {
          label: "Portfolio",
          items: [
            { title: "Properties", url: "/dashboard/property-operations/properties", icon: <Building2Icon /> },
            { title: "Units", url: "/dashboard/property-operations/units", icon: <HomeIcon /> },
            { title: "Health", url: "/dashboard/property-operations/health", icon: <FileChartColumnIcon /> },
          ],
        },
        {
          label: "People",
          items: [
            { title: "Users", url: "/dashboard/property-operations/users", icon: <UsersIcon /> },
            { title: "Owner Team", url: "/dashboard/property-operations/team", icon: <ShieldIcon /> },
            { title: "Tenants", url: "/dashboard/property-operations/tenants", icon: <ShieldIcon /> },
            { title: "Staff", url: "/dashboard/property-operations/staff", icon: <UsersIcon /> },
            { title: "Leases", url: "/dashboard/property-operations/leases", icon: <FileTextIcon /> },
            { title: "Billing", url: "/dashboard/property-operations/billing", icon: <CreditCardIcon /> },
            { title: "Finance", url: "/dashboard/property-operations/finance", icon: <FileChartColumnIcon /> },
            { title: "Technicians", url: "/dashboard/property-operations/technicians", icon: <WrenchIcon /> },
          ],
        },
        {
          label: "Communication",
          items: [
            { title: "Notices", url: "/dashboard/property-operations/notices", icon: <BellIcon /> },
            { title: "Notifications", url: "/dashboard/property-operations/notifications", icon: <BellIcon /> },
            { title: "Documents", url: "/dashboard/property-operations/documents", icon: <FileTextIcon /> },
            { title: "Public links & QR", url: "/dashboard/property-operations/public-links", icon: <RouteIcon /> },
          ],
        },
        {
          label: "Operations",
          items: [
            { title: "Vendors", url: "/dashboard/property-operations/vendors", icon: <BriefcaseBusinessIcon /> },
            { title: "Quotes", url: "/dashboard/property-operations/quotes", icon: <FileTextIcon /> },
            { title: "Assets", url: "/dashboard/property-operations/assets", icon: <WrenchIcon /> },
            { title: "Tickets", url: "/dashboard/property-operations/tickets", icon: <CreditCardIcon /> },
            { title: "Work orders", url: "/dashboard/property-operations/work-orders", icon: <WrenchIcon /> },
            { title: "Reports", url: "/dashboard/property-operations/reports", icon: <FileChartColumnIcon /> },
            { title: "Plan", url: "/dashboard/property-operations/plan", icon: <RouteIcon /> },
            { title: "Recurring", url: "/dashboard/property-operations/recurring", icon: <RepeatIcon /> },
            { title: "Inspections", url: "/dashboard/property-operations/inspections", icon: <FileChartColumnIcon /> },
            { title: "AI", url: "/dashboard/property-operations/ai", icon: <BotIcon /> },
          ],
        },
      ].map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, isActive: isPathActive(item.url) })),
      })),
      navSecondary: [
        { title: "Settings", url: "/dashboard/property-operations/settings", icon: <Settings2Icon />, isActive: pathname === "/dashboard/property-operations/settings" },
      ],
    }
  }

  if (role === "super_admin" || role === "admin") {
    return {
      brand: "Admin",
      navMain: [
        {
          label: "Overview",
          items: [
            { title: "Overview", url: "/dashboard/admin", icon: <LayoutDashboardIcon />, isActive: isPathActive("/dashboard/admin") },
          ],
        },
        {
          label: "Core",
          items: [
            { title: "Users", url: "/dashboard/admin/users", icon: <UsersIcon /> },
            { title: "Organizations", url: "/dashboard/admin/organizations", icon: <Building2Icon /> },
            { title: "Plans", url: "/dashboard/admin/plans", icon: <CreditCardIcon /> },
            { title: "Subscriptions", url: "/dashboard/admin/subscriptions", icon: <FileTextIcon /> },
          ],
        },
        {
          label: "Operations",
          items: [
            { title: "Properties", url: "/dashboard/admin/properties", icon: <HomeIcon /> },
            { title: "Tenants", url: "/dashboard/admin/tenants", icon: <ShieldIcon /> },
            { title: "Technicians", url: "/dashboard/admin/technicians", icon: <WrenchIcon /> },
            { title: "AI", url: "/dashboard/admin/ai", icon: <BotIcon /> },
          ],
        },
      ].map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, isActive: isPathActive(item.url) })),
      })),
      navSecondary: [],
    }
  }

  if (role === "worker") {
    return {
      brand: "Worker",
      navMain: [
        {
          label: "Workspace",
          items: [
            { title: "Overview", url: "/dashboard/worker", icon: <LayoutDashboardIcon />, isActive: isPathActive("/dashboard/worker") },
            { title: "Tickets", url: "/dashboard/worker/tickets", icon: <TicketIcon />, isActive: isPathActive("/dashboard/worker/tickets") },
            { title: "Inspections", url: "/dashboard/worker/inspections", icon: <FileChartColumnIcon />, isActive: isPathActive("/dashboard/worker/inspections") },
            { title: "Recurring", url: "/dashboard/worker/recurring", icon: <RepeatIcon />, isActive: isPathActive("/dashboard/worker/recurring") },
            { title: "Messages", url: "/dashboard/worker/messages", icon: <FileTextIcon />, isActive: isPathActive("/dashboard/worker/messages") },
            { title: "Plan", url: "/dashboard/worker/plan", icon: <RouteIcon />, isActive: isPathActive("/dashboard/worker/plan") },
          ],
        },
      ],
      navSecondary: [
      { title: "Settings", url: "/dashboard/worker/settings", icon: <Settings2Icon />, isActive: isPathActive("/dashboard/worker/settings") },
      ],
    }
  }

  return {
    brand: "Resident",
    navMain: [
      {
        label: "Overview",
        items: [
          { title: "Overview", url: "/dashboard/resident", icon: <LayoutDashboardIcon />, isActive: pathname === "/dashboard/resident" },
        ],
      },
      {
        label: "Portfolio",
        items: [
          { title: "Properties", url: "/dashboard/resident/properties", icon: <Building2Icon /> },
          { title: "Units", url: "/dashboard/resident/units", icon: <HomeIcon /> },
        ],
      },
      {
        label: "People",
        items: [
          { title: "Users", url: "/dashboard/resident/users", icon: <UsersIcon /> },
          { title: "Tenants", url: "/dashboard/resident/tenants", icon: <ShieldIcon /> },
          { title: "Billing", url: "/dashboard/resident/billing", icon: <CreditCardIcon /> },
          { title: "Technicians", url: "/dashboard/resident/technicians", icon: <WrenchIcon /> },
        ],
      },
      {
        label: "Communication",
        items: [
          { title: "Notices", url: "/dashboard/resident/notices", icon: <BellIcon /> },
          { title: "Documents", url: "/dashboard/resident/documents", icon: <FileTextIcon /> },
        ],
      },
      {
        label: "Operations",
        items: [
          { title: "Vendors", url: "/dashboard/resident/vendors", icon: <BriefcaseBusinessIcon /> },
          { title: "Tickets", url: "/dashboard/resident/tickets", icon: <CreditCardIcon /> },
          { title: "Plan", url: "/dashboard/resident/plan", icon: <RouteIcon /> },
          { title: "Recurring", url: "/dashboard/resident/recurring", icon: <RepeatIcon /> },
          { title: "Inspections", url: "/dashboard/resident/inspections", icon: <FileChartColumnIcon /> },
          { title: "AI", url: "/dashboard/resident/ai", icon: <BotIcon /> },
        ],
      },
    ].map((section) => ({
      ...section,
      items: section.items.map((item) => ({ ...item, isActive: isPathActive(item.url) })),
    })),
    navSecondary: [
      { title: "Settings", url: "/dashboard/resident/settings", icon: <Settings2Icon />, isActive: isPathActive("/dashboard/resident/settings") },
    ],
  }
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data: user } = useMeQuery()
  const { mutate: logout, isPending } = useLogoutMutation()
  const nav = buildNav(user?.role, pathname)
  const displayName = user?.fullName ?? "Property User"
  const displayEmail = user?.email ?? "account@local"
  const displayRole = user?.role?.replaceAll("_", " ") ?? ""

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<a href={nav.navMain[0]?.items[0]?.url ?? "/dashboard"} />}
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">{nav.brand}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={nav.navMain} />
        {nav.navSecondary.length ? (
          <NavSecondary items={nav.navSecondary} className="mt-auto" />
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: displayName,
            email: displayEmail,
            avatar: "",
            role: displayRole,
          }}
          onLogout={() => logout()}
          isLoggingOut={isPending}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
