import { BarChart3, Power, Trash2 } from "lucide-react"

import { requireSession } from "@/lib/auth-actions"
import {
  getTenantTrackingSettings,
  removeTenantTrackingAction,
  saveTenantTrackingAction,
  setTenantTrackingStatusAction,
} from "@/lib/tenant-tracking-actions"

type TrackingSettings = {
  tenant: { id: number; businessName: string }
  gtm: { containerId: string | null; enabled: boolean }
}

export default async function TrackingSettingsPage() {
  await requireSession(["Agent"])
  const settings = (await getTenantTrackingSettings()) as TrackingSettings

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-5 sm:p-8 lg:p-10">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#4343d5]">Tenant settings</p>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em]">Google Tag Manager</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Manage the GTM container used only on {settings.tenant.businessName}&apos;s tenant website.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#eff0ff] text-[#4343d5]"><BarChart3 className="size-5" /></span>
          <div>
            <h2 className="font-bold">Container configuration</h2>
            <p className="mt-1 text-sm text-slate-600">Only a GTM container ID is accepted. Custom JavaScript or unrestricted tracking scripts cannot be saved here.</p>
          </div>
        </div>

        <form action={saveTenantTrackingAction} className="mt-6 grid gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold" htmlFor="containerId">GTM container ID</label>
            <input
              className="h-12 w-full rounded-xl border border-slate-300 px-4 uppercase outline-none focus:border-[#4343d5]"
              defaultValue={settings.gtm.containerId ?? ""}
              id="containerId"
              name="containerId"
              pattern="GTM-[A-Za-z0-9]{5,20}"
              placeholder="GTM-XXXXXXX"
              required
            />
          </div>
          <label className="flex items-center gap-3 text-sm font-medium">
            <input defaultChecked={settings.gtm.enabled} name="enabled" type="checkbox" /> Enable this container on tenant public domains
          </label>
          <button className="h-12 rounded-xl bg-[#4343d5] px-5 font-semibold text-white" type="submit">Save GTM settings</button>
        </form>
      </section>

      {settings.gtm.containerId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-bold">Current status</h2>
              <p className="mt-1 font-mono text-sm text-slate-600">{settings.gtm.containerId}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${settings.gtm.enabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{settings.gtm.enabled ? "Enabled" : "Disabled"}</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <form action={setTenantTrackingStatusAction}>
              <input name="enabled" type="hidden" value={String(!settings.gtm.enabled)} />
              <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold" type="submit"><Power className="size-4" /> {settings.gtm.enabled ? "Disable" : "Enable"}</button>
            </form>
            <form action={removeTenantTrackingAction}>
              <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-semibold text-red-700" type="submit"><Trash2 className="size-4" /> Remove container</button>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  )
}
