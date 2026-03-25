"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"
import { agentNavigation } from "@/data/navigation"
import { AppIcon } from "@/components/ui/app-icon"

export function AgentSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-primary/10">
      <SidebarHeader className="border-b border-white/10 bg-primary p-6 text-white">
        <div>
          <Link href="/agent/dashboard" className="flex items-center gap-3">
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
              <AppIcon className="text-sm" name="trending_up" />
              {"5 Active Queues"}
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-primary p-4 text-white">
        <nav aria-label="Agent" className="flex-1">
          <ul className="flex flex-col gap-2">
            {agentNavigation.map((item) => {
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
        </nav>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 bg-primary p-4 text-white">
        <div className="rounded-2xl bg-white/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">
            {"Daily Focus"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <AppIcon className="text-accent" name="group" />
            {"Lead follow-up is on track"}
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-white/75">
            <AppIcon className="text-sm" name="mail" />
            {"Mail, deals, and listings stay inside this focused agent view."}
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
