"use client"

import { AppIcon } from "@/components/ui/app-icon"

export function PropertyFeedbackWorkspaceHeader({
  feedbackCount,
  pendingCount,
  propertyCount,
}: {
  feedbackCount: number
  pendingCount: number
  propertyCount: number
}) {
  const metrics = [
    { label: "Feedback inbox", value: feedbackCount, icon: "rate_review" },
    { label: "Pending requests", value: pendingCount, icon: "schedule_send" },
    { label: "Tracked properties", value: propertyCount, icon: "domain" },
  ]

  return (
    <section className="grid gap-5 rounded-[2rem] border border-[#1b5e8a]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.94))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] lg:grid-cols-[1.35fr_0.95fr]">
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#1b5e8a]/15 bg-[#1b5e8a]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-[#1b5e8a]">
          <AppIcon className="text-sm" name="insights" />
          {"Showing Feedback Workspace"}
        </div>
        <div className="max-w-3xl space-y-3">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {"Collect visit feedback, chase replies, keep owner decisions evidence-based."}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-[15px]">
            {"Use one workspace for visit feedback, showing imports, reminder automation, and reply tracking. Built for agents and admins who need clear next steps fast."}
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {metrics.map((metric) => (
          <article
            className="rounded-[1.45rem] border border-slate-200/80 bg-white/90 p-4"
            key={metric.label}
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
              <AppIcon className="text-[#c18b2f]" name={metric.icon} />
            </div>
            <p className="mt-4 text-3xl font-black tracking-tight text-slate-900">{metric.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
