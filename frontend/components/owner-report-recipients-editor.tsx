"use client"

import type { ReportOwnerDraft } from "@/lib/owner-report-contacts"

export function OwnerReportRecipientsEditor({
  owners,
  onChange,
  disabled = false,
}: {
  owners: ReportOwnerDraft[]
  onChange: (owners: ReportOwnerDraft[]) => void
  disabled?: boolean
}) {
  function patchOwner(id: string, patch: Partial<ReportOwnerDraft>) {
    onChange(owners.map((owner) => owner.id === id ? { ...owner, ...patch } : owner))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">Report recipients ({owners.length}/5)</p>
          <p className="mt-1 text-xs text-slate-500">
            The same property report goes to each owner; it is recorded once in history.
          </p>
        </div>
        <button
          className="rounded-lg border border-[#0d766e] px-3 py-2 text-xs font-bold text-[#0d766e] disabled:opacity-50"
          disabled={disabled || owners.length >= 5}
          onClick={() => onChange([
            ...owners,
            { id: crypto.randomUUID(), name: "", email: "", phone: "" },
          ])}
          type="button"
        >
          + Add owner
        </button>
      </div>

      {owners.map((owner, index) => (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={owner.id}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Owner {index + 1}</p>
            {owners.length > 1 ? (
              <button
                className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                disabled={disabled}
                onClick={() => onChange(owners.filter((item) => item.id !== owner.id))}
                type="button"
              >
                Remove
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-semibold">
              Name
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal"
                disabled={disabled}
                onChange={(event) => patchOwner(owner.id, { name: event.target.value })}
                placeholder="Owner name"
                value={owner.name}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold">
              Email
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal"
                disabled={disabled}
                onChange={(event) => patchOwner(owner.id, { email: event.target.value })}
                placeholder="owner@example.com"
                type="email"
                value={owner.email}
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold sm:col-span-2">
              Phone
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-normal"
                disabled={disabled}
                onChange={(event) => patchOwner(owner.id, { phone: event.target.value })}
                placeholder="+1 555 000 0000"
                type="tel"
                value={owner.phone}
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  )
}
