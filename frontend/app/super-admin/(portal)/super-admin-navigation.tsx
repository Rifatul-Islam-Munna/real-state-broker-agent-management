"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BookOpenText, BrainCircuit, CreditCard, LayoutDashboard, Settings, Users } from "lucide-react"

const groups = [
  {
    label: "Workspace",
    items: [
      { href: "/super-admin", label: "Overview", icon: LayoutDashboard },
      { href: "/super-admin/plans", label: "Plans", icon: CreditCard },
      { href: "/super-admin/tenants", label: "Tenants", icon: Users },
    ],
  },
  {
    label: "Chatbot intelligence",
    items: [
      { href: "/super-admin/chatbot-knowledge", label: "Verified knowledge", icon: BookOpenText },
      { href: "/super-admin/chatbot-learning", label: "AI & self-learning", icon: BrainCircuit },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/super-admin/activity", label: "Activity log", icon: Activity },
      { href: "/super-admin/settings", label: "Platform settings", icon: Settings },
    ],
  },
]

export function SuperAdminNavigation() {
  const pathname = usePathname()
  return (
    <nav className="mt-8 space-y-7" aria-label="Super Admin navigation">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{group.label}</p>
          <div className="space-y-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/super-admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-white text-[#0b1c30] shadow-sm" : "text-white/65 hover:bg-white/10 hover:text-white"}`}
                  href={href}
                  key={href}
                >
                  <span className={`flex size-8 items-center justify-center rounded-lg transition ${active ? "bg-[#4343d5]/10 text-[#4343d5]" : "bg-white/5 text-white/55 group-hover:text-white"}`}>
                    <Icon className="size-4" />
                  </span>
                  <span>{label}</span>
                  {href === "/super-admin/chatbot-learning" ? <span className={`ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${active ? "bg-indigo-50 text-indigo-700" : "bg-indigo-400/15 text-indigo-200"}`}>AI</span> : null}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
