"use client"

import type { OperationsSettings } from "@/lib/property-operations-api"
import { SettingsCore } from "./settings-core"
import { SettingsToggles } from "./settings-toggles"

export function ManagerSettings({ value, setValue, save, saving }: { value: OperationsSettings; setValue: (value: OperationsSettings) => void; save: () => void; saving: boolean }) {
  const change = (key: keyof OperationsSettings, next: string | number | boolean) => setValue({ ...value, [key]: next })
  return <section className="rounded-2xl border bg-background p-5"><h2 className="font-semibold">Property Operations settings</h2><p className="mt-1 text-xs text-muted-foreground">Single-organization branding, form and access settings.</p><div className="mt-5"><SettingsCore value={value} change={change} /></div><div className="mt-5"><SettingsToggles value={value} change={change} /></div><div className="mt-5 flex justify-end"><button className="h-10 rounded-xl bg-primary px-5 font-semibold text-primary-foreground" disabled={saving} onClick={save} type="button">Save settings</button></div></section>
}
