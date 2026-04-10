"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { AppIcon } from "@/components/ui/app-icon"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const adminNavigation = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: "home",
  },
  {
    href: "/admin/property-management",
    label: "Properties",
    icon: "domain",
  },
  {
    href: "/admin/blog",
    label: "Blog",
    icon: "article",
  },
  {
    href: "/admin/deal-pipeline-reports",
    label: "Deal Pipeline",
    icon: "partner_exchange",
  },
  {
    href: "/admin/lead-crm-pipeline",
    label: "Lead CRM",
    icon: "group",
  },
  {
    href: "/admin/lead-history",
    label: "Lead History",
    icon: "history",
  },
  {
    href: "/admin/lead-schedule",
    label: "Lead Schedule",
    icon: "event",
  },
  {
    href: "/admin/contact-inbox",
    label: "Contact Us",
    icon: "contact_phone",
  },
  {
    href: "/admin/mail-monitor",
    label: "Mail",
    icon: "mail",
  },
  {
    href: "/admin/marketing-tools-campaigns",
    label: "Marketing",
    icon: "campaign",
  },
  {
    href: "/admin/document-management",
    label: "Documents",
    icon: "description",
  },
  {
    href: "/admin/agent-team-management",
    label: "Teams",
    icon: "badge",
  },
  {
    href: "/admin/reports-analytics",
    label: "Reports",
    icon: "trending_up",
  },
  {
    href: "/admin/agency-settings",
    label: "Settings",
    icon: "settings",
  },
] as const

type AdminSidebarHistoryProps = {
  agencyName: string
  logoUrl?: string
}

export function AdminSidebarHistory({
  agencyName,
  logoUrl,
}: AdminSidebarHistoryProps) {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="border-b border-white/10 bg-primary p-4 text-white">
        <PortalBrandLink
          agencyName={agencyName}
          href="/admin/dashboard"
          iconWrapperClassName="bg-white/95 p-2"
          logoUrl={logoUrl}
          nameClassName="text-white"
        />
      </SidebarHeader>

      <SidebarContent className="bg-primary p-4 text-white">
        <nav aria-label="Admin" className="flex-1">
          <ul className="flex flex-col gap-2">
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-white text-primary shadow-sm"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <AppIcon className="text-xl" name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
