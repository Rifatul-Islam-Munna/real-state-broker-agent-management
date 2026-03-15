"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo } from "react"

import { getPortalRoutes } from "@/lib/portal-routes"
import { useAdminFlowStore } from "@/stores/admin-flow-store"

export function Section1Section() {
  const pathname = usePathname()
  const mailInbox = useAdminFlowStore((state) => state.mailInbox)
  const convertMailInboxItemToLead = useAdminFlowStore((state) => state.convertMailInboxItemToLead)
  const portalRoutes = getPortalRoutes(pathname)

  const stats = useMemo(
    () => [
      {
        label: "New Mail",
        value: `${mailInbox.filter((item) => item.status === "new").length}`,
      },
      {
        label: "Newsletter",
        value: `${mailInbox.filter((item) => item.kind === "newsletter").length}`,
      },
      {
        label: "Converted",
        value: `${mailInbox.filter((item) => item.status === "converted").length}`,
      },
    ],
    [mailInbox],
  )

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{"Mail Inbox"}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {"Email capture and newsletter signups land here. Convert a strong inquiry into a lead when it should move into the CRM workflow."}
        </p>
      </section>

      <section className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-3 md:px-6">
        {stats.map((stat) => (
          <article key={stat.label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4 px-4 py-6 md:px-6">
        {mailInbox.map((item) => (
          <article key={item.id} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.subject}</h2>
                  <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{item.kind}</span>
                  <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{item.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.message}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Sender"}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.email}</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{item.createdAt}</p>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {item.leadId ? (
                  <Link className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href={portalRoutes.leads}>
                    {"Open Lead CRM"}
                  </Link>
                ) : (
                  <button
                    className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
                    onClick={() => convertMailInboxItemToLead(item.id)}
                    type="button"
                  >
                    {"Convert To Lead"}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
