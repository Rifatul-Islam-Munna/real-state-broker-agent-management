"use client"

import type { PropertyOwnerReportDispatchItem } from "@/hooks/use-real-estate-api"

export function DispatchHistory({
  items,
}: {
  items: PropertyOwnerReportDispatchItem[]
}) {
  return (
    <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Dispatch history"}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{"Sent, skipped, failed"}</h2>
      </div>
      <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7f5f1] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">{"Property"}</th>
              <th className="px-4 py-3 font-bold">{"Period"}</th>
              <th className="px-4 py-3 font-bold">{"Channels"}</th>
              <th className="px-4 py-3 font-bold">{"Status"}</th>
              <th className="px-4 py-3 font-bold">{"Summary"}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr className="border-t border-slate-200" key={item.id}>
                <td className="px-4 py-3 font-semibold text-slate-900">{item.propertyTitle}</td>
                <td className="px-4 py-3 text-slate-600">
                  {`${new Date(item.periodStart).toLocaleDateString()} - ${new Date(item.periodEnd).toLocaleDateString()}`}
                </td>
                <td className="px-4 py-3 text-slate-600">{item.channels.join(", ")}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${
                    item.status === "Sent"
                      ? "bg-emerald-100 text-emerald-700"
                      : item.status === "Skipped"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{item.summary}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-500" colSpan={5}>{"No owner reports sent yet."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
