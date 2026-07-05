"use client"

import { ManagerModules } from "./manager-modules"
import { ManagerOverview } from "./manager-overview"
import { ManagerSettings } from "./manager-settings"
import { ManagerShares } from "./manager-shares"
import { ManagerShell } from "./manager-shell"
import { NestModuleWorkspace } from "./nest-module-workspace"
import { usePropertyOperationsManager } from "./use-property-operations-manager"

export function PropertyOperationsPage() {
  const s = usePropertyOperationsManager()
  return <>
    <ManagerShell loading={s.loading} refresh={() => void s.loadAll()} setTab={s.setTab} tab={s.tab}>
      {s.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{s.error}</div> : null}
      {s.tab === "overview" ? <ManagerOverview analytics={s.analytics} availableProperties={s.availableProperties} completion={s.completion} onImport={() => void s.importSelected()} onOpen={(id) => { s.setActivePropertyId(id); s.setTab("modules") }} onRemove={(id) => void s.removeWorkspace(id)} onSearch={s.setSearch} onToggle={(id) => s.setSelectedIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} saving={s.saving} search={s.search} selectedIds={s.selectedIds} workspaces={s.workspaces} /> : null}
      {s.tab === "modules" ? <ManagerModules activeWorkspace={s.activeWorkspace} onOpenModule={s.setActiveModule} onStatus={(key, status) => void s.updateModule(key, status)} /> : null}
      {s.tab === "requests" ? <ManagerShares items={s.links} revoke={(id) => void s.revokeLink(id)} /> : null}
      {s.tab === "settings" ? <ManagerSettings value={s.settings} setValue={s.setSettings} save={() => void s.saveSettings()} saving={s.saving} /> : null}
    </ManagerShell>
    <NestModuleWorkspace module={s.activeModule} onChanged={() => void s.loadAll()} onClose={() => s.setActiveModule(null)} workspace={s.activeWorkspace} />
  </>
}
