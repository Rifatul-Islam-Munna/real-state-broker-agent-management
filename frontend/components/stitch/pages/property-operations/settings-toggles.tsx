"use client"

import type { OperationsSettings } from "@/lib/property-operations-api"

export function SettingsToggles({ value, change }: { value: OperationsSettings; change: (key: keyof OperationsSettings, value: boolean) => void }) {
  const items: Array<[keyof OperationsSettings, string]> = [
    ["defaultOneTime", "One-time forms by default"],
    ["requireName", "Require responder name"],
    ["requireEmail", "Require responder email"],
    ["requirePhone", "Require responder phone"],
    ["allowFileUploads", "Allow attachments"],
    ["showPropertyAddress", "Show property address"],
    ["autoCloseRecordOnSubmit", "Complete linked record after response"],
    ["notifyAdminOnSubmit", "Notify admin after response"],
  ]
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items.map(([key, label]) => <label className="flex items-center gap-3 rounded-xl border p-3 text-sm" key={key}><input checked={Boolean(value[key])} onChange={(e) => change(key, e.target.checked)} type="checkbox" />{label}</label>)}</div>
}
