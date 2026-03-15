import Link from "next/link"

import { AdminSidebar } from "@/components/stitch/admin/admin-sidebar"
import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <SidebarProvider className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <AdminSidebar />
      <div className="min-w-0 flex-1 bg-background-light dark:bg-background-dark">
        <div className="border-b border-primary/10 bg-white px-4 py-3 dark:bg-slate-900 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin/dashboard" className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-3xl">
                {"domain"}
              </span>
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
