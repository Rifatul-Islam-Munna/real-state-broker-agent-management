import { redirect } from "next/navigation"

import { DashboardSidebar } from "@/components/stitch/shared/dashboard-sidebar"
import { DashboardTopbar } from "@/components/stitch/shared/dashboard-topbar"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import { Button } from "@/components/ui/button"
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
    <SidebarProvider className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <DashboardSidebar
        agencyName={agencyName}
        agentRoutePermissions={user.agentRoutePermissions}
        logoUrl={logoUrl}
        role={user.role}
      />
      <SidebarInset className="min-w-0 bg-background-light dark:bg-background-dark">
        <div className="border-b border-primary/10 bg-white px-4 py-3 dark:bg-slate-900 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <PortalBrandLink
              agencyName={agencyName}
              className="min-w-0 flex-1 text-primary"
              href={homeHref}
              iconWrapperClassName="size-10 rounded-xl border border-primary/10 bg-white p-2"
              logoUrl={logoUrl}
              nameClassName="text-base font-black tracking-tight text-slate-900 dark:text-white"
            />
            <SidebarTrigger
              className="border border-primary/10 text-primary hover:bg-primary/5"
              render={<Button variant="outline" size="icon-sm" />}
            />
          </div>
        </div>
        <div className="hidden md:block">
          <DashboardTopbar
            avatarUrl={user.avatarUrl}
            role={user.role}
            userName={user.fullName}
          />
        </div>
        <div className="min-w-0">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
