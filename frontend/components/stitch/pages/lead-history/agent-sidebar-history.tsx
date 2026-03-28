"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

import { usePortalCurrentUser } from "@/hooks/use-real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { getAccessibleAgentNavigation } from "@/lib/agent-route-access"
import { cn } from "@/lib/utils"

export function AgentSidebarHistory() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentUserQuery = usePortalCurrentUser()
  const currentUser = currentUserQuery.data
  const isLoadingAccess = !currentUser && (currentUserQuery.isLoading || currentUserQuery.isFetching)
  const baseNavigation =
    currentUser?.role === "Admin"
      ? getAccessibleAgentNavigation(["dashboard", "properties", "deal-pipeline", "lead", "mail", "settings"])
      : currentUser?.role === "Agent"
        ? getAccessibleAgentNavigation(currentUser.agentRoutePermissions)
        : []

  const hasLeadAccess = baseNavigation.some((item) => item.permission === "lead")
  const visibleNavigation = hasLeadAccess
    ? [
        ...baseNavigation.flatMap((item) =>
          item.permission === "lead"
            ? [
                item,
                {
                  description: "Lead timeline, outreach history, scheduled follow-up, and conversation logs.",
                  href: "/agent/lead?view=history",
                  icon: "history",
                  label: "Lead History",
                  permission: "lead",
                },
              ]
            : [item],
        ),
      ]
    : baseNavigation

  const homeHref = visibleNavigation[0]?.href ?? "/agent/dashboard"
  const routeCountLabel =
    currentUser?.role === "Admin"
      ? `${visibleNavigation.length} Allowed Routes`
      : `${visibleNavigation.length} Allowed Routes`

  return (
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="border-b border-white/10 bg-primary p-6 text-white">
        <div>
          <Link href={homeHref} className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-primary">
              <AppIcon className="text-3xl" name="domain" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                {"EstateBlue"}
              </h1>
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">
                {"Agent Portal"}
              </p>
            </div>
          </Link>
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              <AppIcon className="text-sm" name="verified" />
              {"Active Agent"}
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <AppIcon className="text-sm" name="tune" />
              {routeCountLabel}
            </div>
          </div>
        </div>
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
                const itemPath = item.href.split("?")[0]
                const isHistoryItem = item.href.includes("view=history")
                const isActive = isHistoryItem
                  ? pathname === "/agent/lead" && searchParams.get("view") === "history"
                  : pathname === itemPath || pathname.startsWith(`${itemPath}/`)

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

      <SidebarFooter className="border-t border-white/10 bg-primary p-4 text-white">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
            {"Route Access"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <AppIcon className="text-accent" name="verified" />
            {"Portal navigation is filtered by admin permissions."}
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/75">
            <AppIcon className="text-sm" name="settings" />
            {"Only the routes granted by admin stay visible and accessible here."}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
