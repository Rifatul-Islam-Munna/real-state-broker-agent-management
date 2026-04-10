"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { useAgencySettings } from "@/hooks/use-real-estate-api"
import { resolvePortalBranding } from "@/lib/portal-branding"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { adminNavigation } from "@/data/navigation"
import { AppIcon } from "@/components/ui/app-icon"

export function AdminSidebar() {
  const pathname = usePathname()
  const agencySettingsQuery = useAgencySettings()
  const { agencyName, logoUrl } = resolvePortalBranding(agencySettingsQuery.data?.profile)

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
        <nav
          aria-label="Admin"
          className="flex-1"
        >
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
    </Sidebar>
  )
}
