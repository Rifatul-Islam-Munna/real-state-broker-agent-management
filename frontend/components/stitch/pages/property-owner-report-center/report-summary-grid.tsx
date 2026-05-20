"use client"

import type { PropertyOwnerReportPropertySummary } from "@/hooks/use-real-estate-api"

export function ReportSummaryGrid({
  isSending,
  items,
  onSend,
}: {
  isSending: boolean
  items: PropertyOwnerReportPropertySummary[]
  onSend: (propertyId?: number) => void
}) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Owner report queue"}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{"Properties needing hard-truth updates"}</h2>
        </div>
        <button
          className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          disabled={isSending}
          onClick={() => onSend()}
          type="button"
        >
          {isSending ? "Processing..." : "Send All Due Reports"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {items.map((item) => (
          <article className="rounded-[1.45rem] border border-slate-200 bg-[#f7f5f1]/70 p-4" key={item.propertyId}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900">{item.propertyTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.ownerName}</p>
              </div>
              <button
                className="rounded-full border border-[#c18b2f] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8b6722]"
                onClick={() => onSend(item.propertyId)}
                type="button"
              >
                {"Send now"}
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <MetricCard label="Negative" tone="rose" value={item.negativeCount} />
              <MetricCard label="Mixed" tone="amber" value={item.mixedCount} />
              <MetricCard label="Positive" tone="emerald" value={item.positiveCount} />
            </div>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>{`Owner contact: ${item.ownerEmail || item.ownerPhone || "Missing"}`}</p>
              <p>{`Latest feedback: ${item.latestFeedbackAt ? new Date(item.latestFeedbackAt).toLocaleString() : "Not available"}`}</p>
              <p>{`Last sent: ${item.lastSentAt ? new Date(item.lastSentAt).toLocaleString() : "Never"}`}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.topIssues.length > 0 ? item.topIssues.map((issue) => (
                <span className="rounded-full border border-[#c18b2f]/25 bg-[#c18b2f]/10 px-3 py-1 text-[11px] font-bold text-[#8b6722]" key={`${item.propertyId}-${issue}`}>
                  {issue}
                </span>
              )) : (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-500">
                  {"No repeated issue tags"}
                </span>
              )}
            </div>
            {item.lastReportSummary ? (
              <p className="mt-4 text-sm leading-6 text-slate-600">{item.lastReportSummary}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string
  tone: "rose" | "amber" | "emerald"
  value: number
}) {
  const toneClass =
    tone === "rose"
      ? "bg-rose-50 text-rose-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700"

  return (
    <div className={`rounded-[1rem] px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}
