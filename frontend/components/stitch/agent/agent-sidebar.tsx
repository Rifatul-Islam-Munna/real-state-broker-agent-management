"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { usePortalCurrentUser } from "@/hooks/use-real-estate-api"
import { cn } from "@/lib/utils"
import { getAccessibleAgentNavigation } from "@/lib/agent-route-access"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { agentNavigation } from "@/data/navigation"
import { AppIcon } from "@/components/ui/app-icon"

type AgentSidebarProps = {
  agencyName: string
  logoUrl?: string
}

export function AgentSidebar({
  agencyName,
  logoUrl,
}: AgentSidebarProps) {
  const pathname = usePathname()
  const currentUserQuery = usePortalCurrentUser()
  const currentUser = currentUserQuery.data
  const isLoadingAccess = !currentUser && (currentUserQuery.isLoading || currentUserQuery.isFetching)
  const visibleNavigation =
    currentUser?.role === "Admin"
      ? [...agentNavigation]
      : currentUser?.role === "Agent"
        ? getAccessibleAgentNavigation(currentUser.agentRoutePermissions)
        : []
  const homeHref = visibleNavigation[0]?.href ?? "/agent/dashboard"

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

      <SidebarContent className="bg-primary p-4 text-white">
        <nav aria-label="Agent" className="flex-1">
          {isLoadingAccess ? (
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-semibold text-white/75">
              {"Loading route access..."}
            </div>
          ) : visibleNavigation.length === 0 ? (
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs font-semibold leading-6 text-white/75">
              {"No agent routes are assigned yet. Ask an admin to grant at least one portal route."}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleNavigation.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)

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
          )}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
