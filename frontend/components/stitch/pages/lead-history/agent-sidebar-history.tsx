"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { AppIcon } from "@/components/ui/app-icon"
import {
  useAgencySettings,
  usePortalCurrentUser,
} from "@/hooks/use-real-estate-api"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar"
import { getAccessibleAgentNavigation } from "@/lib/agent-route-access"
import { resolvePortalBranding } from "@/lib/portal-branding"
import { cn } from "@/lib/utils"

export function AgentSidebarHistory() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentUserQuery = usePortalCurrentUser()
  const agencySettingsQuery = useAgencySettings()
  const currentUser = currentUserQuery.data
  const { agencyName, logoUrl } = resolvePortalBranding(
    agencySettingsQuery.data?.profile
  )
  const isLoadingAccess =
    !currentUser && (currentUserQuery.isLoading || currentUserQuery.isFetching)
  const baseNavigation =
    currentUser?.role === "Admin"
      ? getAccessibleAgentNavigation([
          "dashboard",
          "properties",
          "deal-pipeline",
          "lead",
          "mail",
          "settings",
        ])
      : currentUser?.role === "Agent"
        ? getAccessibleAgentNavigation(currentUser.agentRoutePermissions)
        : []

  const hasLeadAccess = baseNavigation.some(
    (item) => item.permission === "lead"
  )
  const visibleNavigation = hasLeadAccess
    ? [
        ...baseNavigation.flatMap((item) =>
          item.permission === "lead"
            ? [
                item,
                {
                  description:
                    "Lead timeline, outreach history, scheduled follow-up, and conversation logs.",
                  href: "/agent/lead?view=history",
                  icon: "history",
                  label: "Lead History",
                  permission: "lead",
                },
              ]
            : [item]
        ),
      ]
    : baseNavigation

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
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-xs leading-6 font-semibold text-white/75">
              {
                "No agent routes are assigned yet. Ask an admin to grant at least one portal route."
              }
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {visibleNavigation.map((item) => {
                const itemPath = item.href.split("?")[0]
                const isHistoryItem = item.href.includes("view=history")
                const isActive = isHistoryItem
                  ? pathname === "/agent/lead" &&
                    searchParams.get("view") === "history"
                  : pathname === itemPath || pathname.startsWith(`${itemPath}/`)

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
          )}
        </nav>
      </SidebarContent>
    </Sidebar>
  )
}
