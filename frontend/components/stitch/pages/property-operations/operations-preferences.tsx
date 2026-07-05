"use client"

import type { OperationsSettings } from "@/lib/property-operations-api"

export function OperationsPreferences({ value, change }: { value: OperationsSettings; change: (key: keyof OperationsSettings, value: string | number) => void }) {
  const shared = value as OperationsSettings & { currency?: string }
  return <div className="grid gap-4 md:grid-cols-2">
    <p className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground md:col-span-2">Business identity, public URL and currency are synced from the main dashboard.</p>
    {[['Business name', value.businessName], ['Public base URL', value.publicBaseUrl], ['Logo URL', value.logoUrl], ['Currency', shared.currency ?? '']].map(([label, content]) => <label className="text-sm" key={label}>{label}<input className="mt-1 h-10 w-full rounded-xl border bg-muted/40 px-3 text-muted-foreground" disabled value={content} /></label>)}
    <label className="text-sm">Expiry hours<input className="mt-1 h-10 w-full rounded-xl border px-3" min="1" onChange={(e) => change("defaultExpiryHours", Number(e.target.value))} type="number" value={value.defaultExpiryHours} /></label>
    <label className="text-sm">Maximum uses<input className="mt-1 h-10 w-full rounded-xl border px-3" min="1" onChange={(e) => change("defaultMaxUses", Number(e.target.value))} type="number" value={value.defaultMaxUses} /></label>
    <label className="text-sm md:col-span-2">Welcome message<textarea className="mt-1 min-h-20 w-full rounded-xl border p-3" onChange={(e) => change("welcomeMessage", e.target.value)} value={value.welcomeMessage} /></label>
    <label className="text-sm md:col-span-2">Terms<textarea className="mt-1 min-h-20 w-full rounded-xl border p-3" onChange={(e) => change("termsText", e.target.value)} value={value.termsText} /></label>
  </div>
}
