"use client"

import { useEffect, useMemo, useState } from "react"

import type { PropertyOperationsModule } from "@/data/property-operations-modules"
import { useManagedProperties } from "@/hooks/use-real-estate-api"
import {
  propertyOperationsApi,
  type OperationsAnalytics,
  type OperationsPublicAccess,
  type OperationsSettings,
  type OperationsWorkspace,
} from "@/lib/property-operations-api"

export type OperationsTab = "overview" | "modules" | "requests" | "settings"

const defaults: OperationsSettings = {
  businessName: "Property Operations",
  logoUrl: "",
  brandColor: "#111827",
  publicBaseUrl: "",
  defaultExpiryHours: 168,
  defaultMaxUses: 1,
  defaultOneTime: true,
  requireName: true,
  requireEmail: false,
  requirePhone: false,
  allowFileUploads: true,
  showPropertyAddress: true,
  autoCloseRecordOnSubmit: false,
  notifyAdminOnSubmit: true,
  welcomeMessage: "Please review the request and submit the requested information.",
  termsText: "",
  emailSubjectTemplate: "Property request: {{title}}",
  emailBodyTemplate: "Open this secure link to complete the property request: {{link}}",
  smsTemplate: "Property request: {{title}} {{link}}",
  updatedAt: new Date(0).toISOString(),
}

export function usePropertyOperationsManager() {
  const [tab, setTab] = useState<OperationsTab>("overview")
  const [workspaces, setWorkspaces] = useState<OperationsWorkspace[]>([])
  const [activePropertyId, setActivePropertyId] = useState<number | null>(null)
  const [activeModule, setActiveModule] = useState<PropertyOperationsModule | null>(null)
  const [links, setLinks] = useState<OperationsPublicAccess[]>([])
  const [settings, setSettings] = useState<OperationsSettings>(defaults)
  const [analytics, setAnalytics] = useState<OperationsAnalytics | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const propertiesQuery = useManagedProperties({ page: 1, pageSize: 100, search: search.trim() || undefined })
  const availableProperties = propertiesQuery.data?.items ?? []
  const activeWorkspace = useMemo(() => workspaces.find((item) => item.propertyId === activePropertyId) ?? workspaces[0] ?? null, [activePropertyId, workspaces])

  async function loadAll() {
    setLoading(true)
    setError("")
    try {
      const [workspaceData, linkData, settingsData, analyticsData] = await Promise.all([
        propertyOperationsApi.getWorkspaces(),
        propertyOperationsApi.getPublicLinks(),
        propertyOperationsApi.getSettings(),
        propertyOperationsApi.getAnalytics(),
      ])
      setWorkspaces(workspaceData)
      setLinks(linkData)
      setSettings(settingsData)
      setAnalytics(analyticsData)
      setActivePropertyId((current) => current ?? workspaceData[0]?.propertyId ?? null)
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not load Property Operations.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  async function importSelected() {
    if (!selectedIds.length) return
    setSaving(true)
    try {
      const properties = availableProperties.filter((item) => selectedIds.includes(item.id)).map((item) => ({
        propertyId: item.id,
        title: item.title,
        location: item.exactLocation || item.location,
        propertyType: item.propertyType,
        listingType: item.listingType,
        propertyStatus: item.status,
        propertySlug: item.slug,
        thumbnailUrl: item.thumbnailUrl ?? "",
      }))
      await propertyOperationsApi.importProperties(properties)
      setActivePropertyId((current) => current ?? selectedIds[0] ?? null)
      setSelectedIds([])
      await loadAll()
    } catch (value) { setError(value instanceof Error ? value.message : "Could not import properties.") }
    finally { setSaving(false) }
  }

  async function removeWorkspace(propertyId: number) {
    if (!window.confirm("Remove this property and all operational data?")) return
    setSaving(true)
    try { await propertyOperationsApi.removeWorkspace(propertyId); await loadAll() }
    catch (value) { setError(value instanceof Error ? value.message : "Could not remove property.") }
    finally { setSaving(false) }
  }

  async function updateModule(moduleKey: string, status: string) {
    if (!activeWorkspace) return
    try { await propertyOperationsApi.updateModuleState({ propertyId: activeWorkspace.propertyId, moduleKey, status }); await loadAll() }
    catch (value) { setError(value instanceof Error ? value.message : "Could not update module.") }
  }

  async function saveSettings() {
    setSaving(true)
    try { setSettings(await propertyOperationsApi.updateSettings(settings)) }
    catch (value) { setError(value instanceof Error ? value.message : "Could not save settings.") }
    finally { setSaving(false) }
  }

  async function revokeLink(id: string) {
    if (!window.confirm("Revoke this shared form?")) return
    try { await propertyOperationsApi.revokePublicLink(id); await loadAll() }
    catch (value) { setError(value instanceof Error ? value.message : "Could not revoke link.") }
  }

  const readyCount = activeWorkspace?.moduleStates.filter((item) => item.status === "Ready").length ?? 0
  const completion = Math.round((readyCount / 24) * 100)

  return {
    activeModule, activePropertyId, activeWorkspace, analytics, availableProperties, completion, error,
    importSelected, links, loadAll, loading, removeWorkspace, revokeLink,
    saveSettings, saving, search, selectedIds, setActiveModule, setActivePropertyId,
    setSearch, setSelectedIds, setSettings, setTab, settings, tab, updateModule, workspaces,
  }
}
