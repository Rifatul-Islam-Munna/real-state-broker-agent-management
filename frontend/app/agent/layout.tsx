import Link from "next/link"

import { AgentSidebar } from "@/components/stitch/agent/agent-sidebar"
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppIcon } from "@/components/ui/app-icon"

export default function AgentLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <AgentSidebar />
      <div className="min-w-0 flex-1 bg-background-light dark:bg-background-dark">
        <div className="border-b border-primary/10 bg-white px-4 py-3 dark:bg-slate-900 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/agent/dashboard" className="flex items-center gap-2 text-primary">
              <AppIcon className="text-3xl" name="domain" />
              <span className="text-lg font-800 tracking-tighter uppercase">
                {"EstateBlue"}
              </span>
            </Link>
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
