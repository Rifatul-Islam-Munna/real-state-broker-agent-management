import { redirect } from "next/navigation"

import { DashboardSidebar } from "@/components/stitch/shared/dashboard-sidebar"
import { DashboardTopbar } from "@/components/stitch/shared/dashboard-topbar"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { requireSession } from "@/lib/auth-actions"
import { canOpenDashboardRoute, getDashboardHomePath } from "@/lib/dashboard-routes"
import { resolvePortalBranding } from "@/lib/portal-branding"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

type DashboardLayoutProps = Readonly<{
  children: React.ReactNode
}>

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await requireSession(["Admin", "Agent"])
  const homeHref = getDashboardHomePath(user.role, user.agentRoutePermissions)

  if (!canOpenDashboardRoute(homeHref, user.role, user.agentRoutePermissions)) {
    redirect("/login")
  }

  const publicAgencySettings = await getPublicAgencySettings()
  const { agencyName, logoUrl } = resolvePortalBranding(publicAgencySettings.profile)

  return (
    <SidebarProvider className="min-h-screen bg-[var(--ether-surface)] text-[var(--ether-on-surface)]" style={{ "--sidebar-width": "280px" } as React.CSSProperties}>
      <DashboardSidebar
        agencyName={agencyName}
        agentRoutePermissions={user.agentRoutePermissions}
        avatarUrl={user.avatarUrl}
        email={user.email}
        logoUrl={logoUrl}
        role={user.role}
        userName={user.fullName}
      />
      <SidebarInset className="min-w-0 bg-[var(--ether-surface)]">
        <div className="border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4">
            <PortalBrandLink
              agencyName={agencyName}
              className="min-w-0 flex-1 text-foreground"
              href={homeHref}
              iconWrapperClassName="size-10 rounded-xl bg-primary p-2 text-primary-foreground shadow-sm"
              logoUrl={logoUrl}
              nameClassName="text-base font-bold tracking-tight text-foreground"
            />
            <SidebarTrigger className="shadow-xs" size="icon-sm" variant="outline" />
          </div>
        </div>
        <div className="hidden md:block">
          <DashboardTopbar
            avatarUrl={user.avatarUrl}
            role={user.role}
            userName={user.fullName}
          />
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
