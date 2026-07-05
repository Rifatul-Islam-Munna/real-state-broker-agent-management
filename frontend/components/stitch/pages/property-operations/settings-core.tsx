"use client"

import type { OperationsSettings } from "@/lib/property-operations-api"

export function SettingsCore({ value, change }: { value: OperationsSettings; change: (key: keyof OperationsSettings, value: string | number) => void }) {
  return <div className="grid gap-4 md:grid-cols-2">
    <label className="text-sm">Business name<input className="mt-1 h-10 w-full rounded-xl border px-3" onChange={(e) => change("businessName", e.target.value)} value={value.businessName} /></label>
    <label className="text-sm">Public base URL<input className="mt-1 h-10 w-full rounded-xl border px-3" onChange={(e) => change("publicBaseUrl", e.target.value)} value={value.publicBaseUrl} /></label>
    <label className="text-sm">Logo URL<input className="mt-1 h-10 w-full rounded-xl border px-3" onChange={(e) => change("logoUrl", e.target.value)} value={value.logoUrl} /></label>
    <label className="text-sm">Brand color<input className="mt-1 h-10 w-full rounded-xl border px-3" onChange={(e) => change("brandColor", e.target.value)} type="color" value={value.brandColor} /></label>
    <label className="text-sm">Expiry hours<input className="mt-1 h-10 w-full rounded-xl border px-3" min="1" onChange={(e) => change("defaultExpiryHours", Number(e.target.value))} type="number" value={value.defaultExpiryHours} /></label>
    <label className="text-sm">Maximum uses<input className="mt-1 h-10 w-full rounded-xl border px-3" min="1" onChange={(e) => change("defaultMaxUses", Number(e.target.value))} type="number" value={value.defaultMaxUses} /></label>
    <label className="text-sm md:col-span-2">Welcome message<textarea className="mt-1 min-h-20 w-full rounded-xl border p-3" onChange={(e) => change("welcomeMessage", e.target.value)} value={value.welcomeMessage} /></label>
    <label className="text-sm md:col-span-2">Terms<textarea className="mt-1 min-h-20 w-full rounded-xl border p-3" onChange={(e) => change("termsText", e.target.value)} value={value.termsText} /></label>
  </div>
}
