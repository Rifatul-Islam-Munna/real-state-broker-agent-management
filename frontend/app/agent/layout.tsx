import { AgentSidebar } from "@/components/stitch/agent/agent-sidebar"
import { PortalBrandLink } from "@/components/stitch/shared/portal-brand-link"
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { resolvePortalBranding } from "@/lib/portal-branding"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

export default async function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const publicAgencySettings = await getPublicAgencySettings()
  const { agencyName, logoUrl } = resolvePortalBranding(publicAgencySettings.profile)

  return (
    <SidebarProvider className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <AgentSidebar agencyName={agencyName} logoUrl={logoUrl} />
      <div className="min-w-0 flex-1 bg-background-light dark:bg-background-dark">
        <div className="border-b border-primary/10 bg-white px-4 py-3 dark:bg-slate-900 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <PortalBrandLink
              agencyName={agencyName}
              className="min-w-0 flex-1 text-primary"
              href="/agent/dashboard"
              iconWrapperClassName="size-10 rounded-xl border border-primary/10 bg-white p-2"
              logoUrl={logoUrl}
              nameClassName="text-base font-black tracking-tight text-slate-900 dark:text-white"
            />
            <SidebarTrigger className="border border-primary/10 text-primary hover:bg-primary/5" />
          </div>
        </div>
        <div className="min-w-0">
          {children}
        </div>
      </div>
    </SidebarProvider>
  )
}
