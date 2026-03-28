"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { AppIcon } from "@/components/ui/app-icon"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

const adminNavigation = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/admin/property-management",
    label: "Properties",
    icon: "domain",
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

export function AdminSidebarHistory() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="border-b border-white/10 bg-primary p-6 text-white">
        <div>
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary">
              <AppIcon className="text-3xl" name="domain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                {"EstateBlue"}
              </h1>
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                {"Admin Portal"}
              </p>
            </div>
          </Link>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              <AppIcon className="text-sm" name="verified" />
              {"Verified Agency"}
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <AppIcon className="text-sm" name="trending_up" />
              {"Growth +12%"}
            </div>
          </div>
        </div>
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
                        : "text-white/80 hover:bg-white/10 hover:text-white",
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

      <SidebarFooter className="border-t border-white/10 bg-primary p-4 text-white">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
            {"Agency Health"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <AppIcon className="text-accent" name="verified" />
            {"All systems synced"}
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/75">
            <AppIcon className="text-sm" name="trending_up" />
            {"Listings and lead activity are trending up this week."}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
