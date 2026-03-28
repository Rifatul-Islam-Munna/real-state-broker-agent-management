"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"

import type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  AgencySettings,
  AgentUserOption,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useAgencySettings,
  useAgentUsers,
  useCreateAgentUser,
  useDeleteAgentUser,
  useUpdateAgencySettings,
  useUpdateAgentUser,
} from "@/hooks/use-real-estate-api"
import { agentRouteAccessItems } from "@/lib/agent-route-access"
import { agencySocialPlatformOptions } from "@/lib/agency-social-links"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { cloneAgencySettings, defaultAgencySettings } from "@/lib/agency-settings"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"
import { SecureIntegrationsSection } from "./secure-integrations-section"

type AccessMode = "full" | "custom"
type SettingsUserDialogState =
  | { mode: "create" }
  | { mode: "edit"; agent: AgentUserOption }
  | null

type AgentEditorFormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  agencyName: string
  licenseNumber: string
  commissionRate: string
  avatarUrl: string
  bio: string
  isVerifiedAgent: boolean
  isActive: boolean
  accessMode: AccessMode
  agentRoutePermissions: string[]
}

type AgentEditorFormErrors = Partial<Record<keyof AgentEditorFormValues | "form", string>>

const initialAgentEditorValues: AgentEditorFormValues = {
  accessMode: "full",
  agentRoutePermissions: [],
  agencyName: "",
  avatarUrl: "",
  bio: "",
  commissionRate: "",
  email: "",
  firstName: "",
  isActive: true,
  isVerifiedAgent: false,
  lastName: "",
  licenseNumber: "",
  password: "",
  phone: "",
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "Not saved yet"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not saved yet"
  }

  return formatDateTimeLabel(value)
}

function collectAgencyAssetObjectNames(settings: AgencySettings) {
  return [settings.profile.logo.objectName].filter((item): item is string => Boolean(item))
}

function SectionCard({
  icon,
  title,
  children,
}: Readonly<{
  icon: string
  title: string
  children: ReactNode
}>) {
  return (
    <section>
      <div className="mb-6 flex items-center gap-2 border-b border-primary/10 pb-2">
        <AppIcon className="text-accent" name={icon} />
        <h3 className="text-xl font-bold uppercase tracking-tight text-neutral-base">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function channelBadgeClass(channel: AgencyCommunicationChannel) {
  return channel === "Email"
    ? "bg-accent/10 text-accent border-accent/20"
    : "bg-secondary/10 text-secondary border-secondary/20"
}

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

function agentInitials(agent: AgentUserOption) {
  const parts = (agent.fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function parseCommissionRate(value: string) {
  const numericValue = Number.parseFloat(value.trim())
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatRoleLabel(role?: string | null) {
  const value = role?.trim()
  return value?.length ? value : "Agent"
}

function roleBadgeClass(role?: string | null) {
  switch ((role ?? "").toLowerCase()) {
    case "admin":
      return "bg-primary/10 text-primary border-primary/10"
    case "team leader":
      return "bg-secondary/10 text-secondary border-secondary/10"
    default:
      return "bg-slate-100 text-slate-600 border-slate-200"
  }
}

function buildInitialAgentEditorValues(agent?: AgentUserOption | null): AgentEditorFormValues {
  if (!agent) {
    return initialAgentEditorValues
  }

  const fullNameParts = (agent.fullName ?? "").trim().split(/\s+/).filter(Boolean)

  return {
    accessMode: agent.hasCustomAgentRoutePermissions ? "custom" : "full",
    agencyName: agent.agencyName ?? "",
    agentRoutePermissions: agent.hasCustomAgentRoutePermissions ? [...(agent.agentRoutePermissions ?? [])] : [],
    avatarUrl: agent.avatarUrl ?? "",
    bio: agent.bio ?? "",
    commissionRate: agent.commissionRate != null ? `${agent.commissionRate}` : "",
    email: agent.email ?? "",
    firstName: fullNameParts[0] || "",
    isActive: agent.isActive ?? true,
    isVerifiedAgent: agent.isVerifiedAgent,
    lastName: fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : "",
    licenseNumber: agent.licenseNumber ?? "",
    password: "",
    phone: agent.phone ?? "",
  }
}

function validateAgentValues(values: AgentEditorFormValues, mode: "create" | "edit") {
  const errors: AgentEditorFormErrors = {}

  if (!values.firstName.trim()) errors.firstName = "First name is required."
  if (!values.lastName.trim()) errors.lastName = "Last name is required."
  if (!values.email.trim()) {
    errors.email = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address."
  }

  if (mode === "create" && values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters."
  }
  if (mode === "edit" && values.password.trim().length > 0 && values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters."
  }
  if (values.commissionRate.trim() && parseCommissionRate(values.commissionRate) === null) {
    errors.commissionRate = "Enter a valid commission rate."
  }
  if (values.accessMode === "custom" && values.agentRoutePermissions.length === 0) {
    errors.agentRoutePermissions = "Select at least one route permission."
  }

  return errors
}

function AgentFieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null
}

function AgentAccessFields({
  errors,
  onAccessModeChange,
  onTogglePermission,
  values,
}: {
  errors: AgentEditorFormErrors
  onAccessModeChange: (value: AccessMode) => void
  onTogglePermission: (permission: string) => void
  values: AgentEditorFormValues
}) {
  return (
    <div className="space-y-4 border border-primary/10 bg-primary/5 p-4 md:col-span-2">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{"Permission Access"}</p>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {"Choose whether the user gets the full agent portal or only selected routes."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{"Access Mode"}</label>
          <Select modal={false} onValueChange={(value) => onAccessModeChange(value as AccessMode)} value={values.accessMode}>
            <SelectTrigger className="rounded-none border-primary/10 bg-white">
              <SelectValue placeholder="Select access mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{"Full Agent Portal"}</SelectItem>
              <SelectItem value="custom">{"Custom Route Access"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {values.accessMode === "custom" ? (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{"Allowed Routes"}</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentRouteAccessItems.map((item) => {
                const checked = values.agentRoutePermissions.includes(item.permission)
                return (
                  <label key={item.permission} className="flex items-start gap-3 border border-primary/10 bg-white p-3 text-sm">
                    <input
                      checked={checked}
                      className="mt-0.5 rounded border-primary/20 text-primary focus:ring-primary"
                      onChange={() => onTogglePermission(item.permission)}
                      type="checkbox"
                    />
                    <span className="space-y-1">
                      <span className="block font-semibold text-slate-700 dark:text-slate-200">{item.label}</span>
                      <span className="block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <AgentFieldError error={errors.agentRoutePermissions} />
          </div>
        ) : (
          <div className="flex items-center border border-dashed border-primary/20 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {"This user can open every current agent portal route."}
          </div>
        )}
      </div>
    </div>
  )
}

function SettingsUserEditorDialog({
  initialFormValues,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
}: {
  initialFormValues: AgentEditorFormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: AgentEditorFormValues) => Promise<string | null>
  open: boolean
}) {
  const [values, setValues] = useState<AgentEditorFormValues>(initialFormValues)
  const [errors, setErrors] = useState<AgentEditorFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setValues(initialFormValues)
    setErrors({})
    setSubmitError(null)
  }, [initialFormValues, open])

  function setField<K extends keyof AgentEditorFormValues>(key: K, value: AgentEditorFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
    setSubmitError(null)
  }

  function togglePermission(permission: string) {
    setValues((current) => ({
      ...current,
      agentRoutePermissions: current.agentRoutePermissions.includes(permission)
        ? current.agentRoutePermissions.filter((item) => item !== permission)
        : [...current.agentRoutePermissions, permission],
    }))
    setErrors((current) => ({ ...current, agentRoutePermissions: undefined, form: undefined }))
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="rounded-none border border-primary/10 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-primary/10 px-6 py-5">
          <DialogTitle className="text-lg font-bold uppercase tracking-tight text-primary">
            {mode === "create" ? "Create User" : "Edit User"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === "create"
              ? "Add a new agent account from the settings page, including route permissions."
              : "Update the user profile, login status, and route permissions anytime."}
          </DialogDescription>
        </div>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validateAgentValues(values, mode)

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors)
              return
            }

            const error = await onSubmit(values)
            if (error) {
              setSubmitError(error)
              return
            }

            onClose()
          }}
        >
          <div className="grid gap-4 overflow-y-auto px-6 py-5 md:grid-cols-2">
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" value={values.firstName} /><AgentFieldError error={errors.firstName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" value={values.lastName} /><AgentFieldError error={errors.lastName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("email", event.target.value)} placeholder="Email" type="email" value={values.email} /><AgentFieldError error={errors.email} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("password", event.target.value)} placeholder={mode === "create" ? "Temporary password" : "New password (optional)"} type="password" value={values.password} /><AgentFieldError error={errors.password} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("phone", event.target.value)} placeholder="Phone" value={values.phone} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("agencyName", event.target.value)} placeholder="Team / agency name" value={values.agencyName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("licenseNumber", event.target.value)} placeholder="License number" value={values.licenseNumber} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("commissionRate", event.target.value)} placeholder="Commission rate" value={values.commissionRate} /><AgentFieldError error={errors.commissionRate} /></div>
            <div className="md:col-span-2"><Input className="rounded-none border-primary/10" onChange={(event) => setField("avatarUrl", event.target.value)} placeholder="Avatar URL" value={values.avatarUrl} /></div>
            <div className="md:col-span-2"><Textarea className="min-h-24 rounded-none border-primary/10" onChange={(event) => setField("bio", event.target.value)} placeholder="Short bio" value={values.bio} /></div>
            <AgentAccessFields errors={errors} onAccessModeChange={(value) => setField("accessMode", value)} onTogglePermission={togglePermission} values={values} />
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <input checked={values.isVerifiedAgent} className="form-checkbox rounded border-primary/20 text-primary focus:ring-primary" onChange={(event) => setField("isVerifiedAgent", event.target.checked)} type="checkbox" />
              {"Verified agent"}
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <input checked={values.isActive} className="form-checkbox rounded border-primary/20 text-primary focus:ring-primary" onChange={(event) => setField("isActive", event.target.checked)} type="checkbox" />
              {"Active account"}
            </label>
            {submitError ? <p className="text-sm font-semibold text-rose-600 md:col-span-2">{submitError}</p> : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-primary/10 px-6 py-4">
            <button className="border border-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary" onClick={onClose} type="button">{"Close"}</button>
            <button className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">
              {isSubmitting ? mode === "create" ? "Creating..." : "Saving..." : mode === "create" ? "Create User" : "Save User"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MainContentSection() {
  const agencySettingsQuery = useAgencySettings()
  const updateMutation = useUpdateAgencySettings()
  const agentUsersQuery = useAgentUsers({ includeInactive: true })
  const createAgentMutation = useCreateAgentUser()
  const updateAgentMutation = useUpdateAgentUser()
  const deleteAgentMutation = useDeleteAgentUser()
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const [formValues, setFormValues] = useState<AgencySettings>(() => cloneAgencySettings(defaultAgencySettings))
  const [savedValues, setSavedValues] = useState<AgencySettings>(() => cloneAgencySettings(defaultAgencySettings))
  const [selectedTemplateId, setSelectedTemplateId] = useState(defaultAgencySettings.communicationTemplates[0]?.id ?? "")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLogoUploading, setIsLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [userDialogState, setUserDialogState] = useState<SettingsUserDialogState>(null)

  useEffect(() => {
    if (!agencySettingsQuery.data) {
      return
    }

    const nextValues = cloneAgencySettings(agencySettingsQuery.data)
    setFormValues(nextValues)
    setSavedValues(cloneAgencySettings(nextValues))
    setSelectedTemplateId((current) =>
      nextValues.communicationTemplates.some((item) => item.id === current)
        ? current
        : (nextValues.communicationTemplates[0]?.id ?? ""),
    )
  }, [agencySettingsQuery.data])

  const hasPendingChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(savedValues),
    [formValues, savedValues],
  )

  const selectedTemplateIndex = useMemo(
    () => formValues.communicationTemplates.findIndex((item) => item.id === selectedTemplateId),
    [formValues.communicationTemplates, selectedTemplateId],
  )

  const selectedTemplate = selectedTemplateIndex >= 0 ? formValues.communicationTemplates[selectedTemplateIndex] : null
  const agentUsers = useMemo(
    () =>
      [...(agentUsersQuery.data ?? [])].sort(
        (left, right) => new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime(),
      ),
    [agentUsersQuery.data],
  )
  const initialAgentFormValues = useMemo(
    () => (userDialogState?.mode === "edit" ? buildInitialAgentEditorValues(userDialogState.agent) : initialAgentEditorValues),
    [userDialogState],
  )

  function updateSettings(update: (current: AgencySettings) => AgencySettings) {
    setFormValues((current) => update(current))
    setSubmitError(null)
  }

  function updateTemplate(update: (current: AgencyCommunicationTemplateItem) => AgencyCommunicationTemplateItem) {
    if (selectedTemplateIndex < 0) {
      return
    }

    updateSettings((current) => ({
      ...current,
      communicationTemplates: current.communicationTemplates.map((item, index) =>
        index === selectedTemplateIndex ? update(item) : item,
      ),
    }))
  }

  async function handleLogoSelection(file: File) {
    setIsLogoUploading(true)
    setLogoError(null)

    try {
      const uploaded = await uploadPropertyAsset(file, "settings/agency-logo")
      updateSettings((current) => ({
        ...current,
        profile: {
          ...current.profile,
          logo: {
            objectName: uploaded.objectName,
            url: uploaded.url,
          },
        },
      }))
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "Failed to upload agency logo.")
    } finally {
      setIsLogoUploading(false)
    }
  }

  async function handleSave() {
    setSubmitError(null)
    setLogoError(null)

    const previousObjectNames = new Set(collectAgencyAssetObjectNames(savedValues))

    const payload: AgencySettings = {
      ...formValues,
      communicationTemplates: (formValues.communicationTemplates ?? []).map((item) => ({
        ...item,
        variableTokens: (item.variableTokens ?? []).filter(Boolean),
      })),
      profile: {
        ...formValues.profile,
        contactPhone: (formValues.profile.contactPhone ?? "").trim(),
        officeLocations: (formValues.profile.officeLocations ?? []).map((item) => (item ?? "").trim()).filter(Boolean),
        socialLinks: (formValues.profile.socialLinks ?? []).map((item) => ({
          ...item,
          url: (item.url ?? "").trim(),
        })),
      },
    }

    const response = await updateMutation.mutateAsync(payload)

    if (response.error || !response.data) {
      setSubmitError(response.error?.message ?? "Failed to save agency settings.")
      return
    }

    const nextValues = cloneAgencySettings(response.data)
    setFormValues(nextValues)
    setSavedValues(cloneAgencySettings(nextValues))

    if (!nextValues.communicationTemplates.some((item) => item.id === selectedTemplateId)) {
      setSelectedTemplateId(nextValues.communicationTemplates[0]?.id ?? "")
    }

    const nextObjectNames = new Set(collectAgencyAssetObjectNames(nextValues))
    const removedObjectNames = Array.from(previousObjectNames).filter((item) => !nextObjectNames.has(item))

    if (removedObjectNames.length > 0) {
      await Promise.allSettled(removedObjectNames.map((item) => deleteUploadedAsset(item)))
    }
  }

  const isLoading =
    !agencySettingsQuery.data && (agencySettingsQuery.isLoading || agencySettingsQuery.isFetching)

  async function handleCreateAgent(values: AgentEditorFormValues) {
    const response = await createAgentMutation.mutateAsync({
      agencyName: values.agencyName.trim() || null,
      agentRoutePermissions: values.accessMode === "custom" ? values.agentRoutePermissions : [],
      avatarUrl: values.avatarUrl.trim() || null,
      bio: values.bio.trim() || null,
      commissionRate: parseCommissionRate(values.commissionRate),
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      isActive: values.isActive,
      isVerifiedAgent: values.isVerifiedAgent,
      lastName: values.lastName.trim(),
      licenseNumber: values.licenseNumber.trim() || null,
      password: values.password,
      phone: values.phone.trim() || null,
      useCustomAgentRoutePermissions: values.accessMode === "custom",
    })

    if (response.error?.statusCode === 404) {
      return "POST /api/users/agents is not available on the running backend. Restart the backend to load the new agent endpoint."
    }

    return response.error?.message ?? null
  }

  async function handleUpdateAgent(agent: AgentUserOption, values: AgentEditorFormValues) {
    const response = await updateAgentMutation.mutateAsync({
      agencyName: values.agencyName.trim() || null,
      agentRoutePermissions: values.accessMode === "custom" ? values.agentRoutePermissions : [],
      avatarUrl: values.avatarUrl.trim() || null,
      bio: values.bio.trim() || null,
      commissionRate: parseCommissionRate(values.commissionRate),
      email: values.email.trim(),
      firstName: values.firstName.trim(),
      id: agent.id,
      isActive: values.isActive,
      isVerifiedAgent: values.isVerifiedAgent,
      lastName: values.lastName.trim(),
      licenseNumber: values.licenseNumber.trim() || null,
      password: values.password.trim() || null,
      phone: values.phone.trim() || null,
      useCustomAgentRoutePermissions: values.accessMode === "custom",
    })

    if (response.error?.statusCode === 404) {
      return "PATCH /api/users/agents is not available on the running backend. Restart the backend to load the new agent update endpoint."
    }

    return response.error?.message ?? null
  }

  async function handleDeleteAgent(agent: AgentUserOption) {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        `Delete ${agent.fullName}? This removes the agent from active lists and clears current property assignments.`,
      )

      if (!confirmed) {
        return
      }
    }

    await deleteAgentMutation.mutateAsync({ id: `${agent.id}` })
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-primary/10 bg-white px-8 py-4 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-primary">{"Settings"}</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/50">
            {"Profile and templates save here. Integrations save inside each panel."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-primary/60 transition-colors hover:text-primary">
            <AppIcon name="notifications" />
          </button>
          <button
            className="rounded border border-primary/20 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasPendingChanges || updateMutation.isPending || isLoading || isLogoUploading}
            onClick={() => {
              setFormValues(cloneAgencySettings(savedValues))
              setLogoError(null)
              setSubmitError(null)
            }}
            type="button"
          >
            {"Reset"}
          </button>
          <button
            className="rounded bg-primary px-4 py-1.5 text-sm font-semibold text-white no-shadow transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!hasPendingChanges || updateMutation.isPending || isLoading || isLogoUploading}
            onClick={() => void handleSave()}
            type="button"
          >
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-12 p-8 pb-24">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="border border-secondary/10 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/50">{"Status"}</p>
            <p className="mt-3 text-2xl font-black text-primary">
              {isLoading ? "Loading..." : hasPendingChanges ? "Unsaved Changes" : "Synced"}
            </p>
          </article>
          <article className="border border-secondary/10 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/50">{"Last Saved"}</p>
            <p className="mt-3 text-lg font-black text-primary">{formatUpdatedAt(savedValues.updatedAt)}</p>
          </article>
          <article className="border border-secondary/10 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/50">{"Template Count"}</p>
            <p className="mt-3 text-2xl font-black text-primary">{formValues.communicationTemplates.length}</p>
          </article>
        </section>

        {agencySettingsQuery.error ? (
          <section className="border border-rose-200 bg-rose-50 px-6 py-5">
            <p className="text-sm font-bold text-rose-700">{agencySettingsQuery.error.message}</p>
          </section>
        ) : null}

        {submitError ? (
          <section className="border border-rose-200 bg-rose-50 px-6 py-5">
            <p className="text-sm font-bold text-rose-700">{submitError}</p>
          </section>
        ) : null}

        <SectionCard icon="business" title="Agency Profile">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Agency Name"}</label>
                <Input
                  className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      profile: { ...current.profile, agencyName: event.target.value },
                    }))}
                  type="text"
                  value={formValues.profile.agencyName}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Tax ID"}</label>
                  <Input
                    className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        profile: { ...current.profile, taxId: event.target.value },
                      }))}
                    placeholder="XX-XXXXXXX"
                    type="text"
                    value={formValues.profile.taxId}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Standard Commission (%)"}</label>
                  <Input
                    className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                    onChange={(event) =>
                      updateSettings((current) => ({
                        ...current,
                        profile: { ...current.profile, standardCommissionPercent: event.target.value },
                      }))}
                    type="number"
                    value={formValues.profile.standardCommissionPercent}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Agency Logo"}</label>
                <div className="border-2 border-dashed border-secondary/30 bg-white p-6">
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      event.target.value = ""

                      if (file) {
                        void handleLogoSelection(file)
                      }
                    }}
                    ref={logoInputRef}
                    type="file"
                  />
                  {formValues.profile.logo.url ? (
                    <div className="space-y-4">
                      <div className="overflow-hidden border border-secondary/10 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="Agency logo" className="h-40 w-full object-contain p-4" src={formValues.profile.logo.url} />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded border border-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/5"
                          onClick={() => logoInputRef.current?.click()}
                          type="button"
                        >
                          {isLogoUploading ? "Uploading..." : "Replace Logo"}
                        </button>
                        <button
                          className="rounded border border-rose-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-rose-600 transition-colors hover:bg-rose-50"
                          onClick={() =>
                            updateSettings((current) => ({
                              ...current,
                              profile: {
                                ...current.profile,
                                logo: {
                                  objectName: null,
                                  url: "",
                                },
                              },
                            }))}
                          type="button"
                        >
                          {"Remove Logo"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="flex w-full flex-col items-center justify-center py-8 text-center"
                      onClick={() => logoInputRef.current?.click()}
                      type="button"
                    >
                      <AppIcon className="text-4xl text-secondary/40" name="upload_file" />
                      <p className="mt-2 text-xs text-secondary">
                        {isLogoUploading ? "Uploading logo..." : "Drag and drop or click to upload"}
                      </p>
                    </button>
                  )}
                  {logoError ? <p className="mt-3 text-xs font-semibold text-rose-600">{logoError}</p> : null}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Office Locations"}</label>
                <div className="space-y-2">
                  {formValues.profile.officeLocations.map((location, index) => (
                    <div key={`location-${index}`} className="flex gap-2">
                      <Input
                        className="flex-1 border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                        onChange={(event) =>
                          updateSettings((current) => ({
                            ...current,
                            profile: {
                              ...current.profile,
                              officeLocations: current.profile.officeLocations.map((item, itemIndex) =>
                                itemIndex === index ? event.target.value : item,
                              ),
                            },
                          }))}
                        placeholder="Office location"
                        type="text"
                        value={location}
                      />
                      <button
                        className="p-2 text-red-500 hover:bg-red-50"
                        onClick={() =>
                          updateSettings((current) => {
                            const nextLocations = current.profile.officeLocations.filter((_, itemIndex) => itemIndex !== index)

                            return {
                              ...current,
                              profile: {
                                ...current.profile,
                                officeLocations: nextLocations.length > 0 ? nextLocations : [""],
                              },
                            }
                          })}
                        type="button"
                      >
                        <AppIcon name="delete" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="inline-flex items-center gap-2 rounded-sm bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white no-shadow"
                    onClick={() =>
                      updateSettings((current) => ({
                        ...current,
                        profile: {
                          ...current.profile,
                          officeLocations: [...current.profile.officeLocations, ""],
                        },
                      }))}
                    type="button"
                  >
                    <AppIcon className="text-sm" name="add" />
                    {"Add Location"}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Contact Email"}</label>
                <Input
                  className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      profile: { ...current.profile, contactEmail: event.target.value },
                    }))}
                  type="email"
                  value={formValues.profile.contactEmail}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Contact Phone"}</label>
                <Input
                  className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                  onChange={(event) =>
                    updateSettings((current) => ({
                      ...current,
                      profile: { ...current.profile, contactPhone: event.target.value },
                    }))}
                  placeholder="+1 (555) 302-4400"
                  type="text"
                  value={formValues.profile.contactPhone}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-primary/70">{"Social Media Links"}</label>
                  <p className="text-xs text-primary/60">
                    {"These links appear on the public footer and contact page."}
                  </p>
                </div>
                <div className="grid gap-3">
                  {agencySocialPlatformOptions.map((platform) => {
                    const socialLink = formValues.profile.socialLinks.find((item) => item.platform === platform.platform)

                    return (
                      <div key={platform.platform} className="grid gap-2 md:grid-cols-[11rem_1fr] md:items-center">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                          <AppIcon className="text-base" name={platform.icon} />
                          {platform.label}
                        </label>
                        <Input
                          className="w-full border-2 border-secondary/20 bg-white px-3 py-2 outline-none focus:border-primary"
                          onChange={(event) =>
                            updateSettings((current) => ({
                              ...current,
                              profile: {
                                ...current.profile,
                                socialLinks: current.profile.socialLinks.map((item) =>
                                  item.platform === platform.platform ? { ...item, url: event.target.value } : item,
                                ),
                              },
                            }))}
                          placeholder={platform.placeholder}
                          type="url"
                          value={socialLink?.url ?? ""}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="rounded border border-secondary/10 bg-primary/5 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/60">{"Saved Profile Data"}</p>
                <p className="mt-3 text-sm text-primary/80">
                  {"Agency name, logo, office locations, contact email, contact phone, and social links now save through the backend and feed the public site branding blocks."}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="mail" title="Communication Templates">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="border-2 border-secondary/10 bg-white p-4 lg:col-span-1">
              <h4 className="mb-3 border-b border-secondary/10 pb-2 text-sm font-bold">{"Available Templates"}</h4>
              <ul className="space-y-1">
                {formValues.communicationTemplates.map((template) => {
                  const isActive = template.id === selectedTemplateId

                  return (
                    <li key={template.id}>
                      <button
                        className={`w-full rounded p-2 text-left text-sm font-semibold transition-colors ${
                          isActive ? "bg-primary/5 text-primary" : "hover:bg-secondary/5"
                        }`}
                        onClick={() => setSelectedTemplateId(template.id)}
                        type="button"
                      >
                        {template.name}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
            <div className="space-y-4 border-2 border-secondary/10 bg-white p-6 lg:col-span-2">
              {selectedTemplate ? (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase text-primary">
                      {`Edit: ${selectedTemplate.name}`}
                    </h4>
                    <div className="flex gap-2">
                      {selectedTemplate.channels.map((channel) => (
                        <span
                          key={channel}
                          className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${channelBadgeClass(channel)}`}
                        >
                          {channel}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded border border-secondary/10 bg-slate-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                      <input
                        checked={selectedTemplate.channels.includes("Email")}
                        className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                        onChange={(event) =>
                          updateTemplate((current) => ({
                            ...current,
                            channels: event.target.checked
                              ? Array.from(new Set([...current.channels, "Email"]))
                              : current.channels.filter((channel) => channel !== "Email"),
                          }))}
                        type="checkbox"
                      />
                      {"Email Enabled"}
                    </label>
                    <label className="flex items-center gap-2 rounded border border-secondary/10 bg-slate-50 px-3 py-3 text-xs font-bold uppercase tracking-[0.16em] text-primary/70">
                      <input
                        checked={selectedTemplate.channels.includes("SMS")}
                        className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                        onChange={(event) =>
                          updateTemplate((current) => ({
                            ...current,
                            channels: event.target.checked
                              ? Array.from(new Set([...current.channels, "SMS"]))
                              : current.channels.filter((channel) => channel !== "SMS"),
                          }))}
                        type="checkbox"
                      />
                      {"SMS Enabled"}
                    </label>
                  </div>
                  <Input
                    className="mb-4 w-full border-2 border-secondary/20 px-3 py-2 font-bold outline-none focus:border-primary"
                    onChange={(event) => updateTemplate((current) => ({ ...current, subject: event.target.value }))}
                    type="text"
                    value={selectedTemplate.subject}
                  />
                  <Textarea
                    className="w-full resize-none border-2 border-secondary/20 px-3 py-2 outline-none focus:border-primary"
                    onChange={(event) => updateTemplate((current) => ({ ...current, body: event.target.value }))}
                    rows={6}
                    value={selectedTemplate.body}
                  />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedTemplate.variableTokens.map((token) => (
                      <span
                        key={token}
                        className="cursor-default bg-secondary/10 px-2 py-1 font-mono text-[10px] text-primary hover:bg-secondary/20"
                      >
                        {token}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm font-semibold text-primary/60">{"No template selected."}</p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard icon="hub" title="Integrations">
          <SecureIntegrationsSection />
        </SectionCard>

        <SectionCard icon="group" title="User Management">
          <div className="mb-6 flex items-center justify-between border-b border-primary/10 pb-2">
            <div>
              <p className="text-sm font-semibold text-primary/70">{`${agentUsers.length} saved users in the live agent system`}</p>
            </div>
            <button className="flex items-center gap-1 bg-accent px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white no-shadow hover:bg-accent/90" onClick={() => setUserDialogState({ mode: "create" })} type="button">
              <AppIcon className="text-sm" name="person_add" />
              {" Add User "}
            </button>
          </div>
          <div className="overflow-hidden bg-white border-2 border-secondary/10">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b-2 border-secondary/10 bg-primary/5">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">{"Name"}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">{"Email"}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">{"Role"}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-primary/70">{"Status"}</th>
                  <th className="px-6 py-4 text-right text-xs font-bold uppercase text-primary/70">{"Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/5">
                {!agentUsersQuery.data && (agentUsersQuery.isLoading || agentUsersQuery.isFetching) ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm font-semibold text-primary/60" colSpan={5}>
                      {"Loading users..."}
                    </td>
                  </tr>
                ) : agentUsersQuery.error ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm font-semibold text-rose-600" colSpan={5}>
                      {agentUsersQuery.error.message}
                    </td>
                  </tr>
                ) : agentUsers.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-sm font-semibold text-primary/60" colSpan={5}>
                      {"No users have been created yet."}
                    </td>
                  </tr>
                ) : agentUsers.map((user, index) => (
                  <tr key={user.id} className="transition-colors hover:bg-secondary/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${index % 3 === 0 ? "bg-primary" : index % 3 === 1 ? "bg-secondary" : "bg-accent"}`}>
                          {agentInitials(user)}
                        </div>
                        <div>
                          <span className="text-sm font-semibold">{user.fullName}</span>
                          <p className="text-xs text-primary/50">{displayText(user.agencyName, "Independent")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/70">
                      <div>
                        <p>{user.email}</p>
                        <p className="text-xs text-primary/50">{displayText(user.phone, "No phone")}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`border px-2 py-0.5 text-[10px] font-bold uppercase rounded-sm ${roleBadgeClass(user.role)}`}>
                        {formatRoleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.isActive === false ? "text-rose-600" : "text-green-600"}`}>
                          <span className={`size-2 rounded-full ${user.isActive === false ? "bg-rose-500" : "bg-green-500"}`} />
                          {user.isActive === false ? "Inactive" : "Active"}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${user.isVerifiedAgent ? "text-primary" : "text-slate-400"}`}>
                          {user.isVerifiedAgent ? "Verified" : "Standard"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 text-primary/40 hover:text-primary" onClick={() => setUserDialogState({ mode: "edit", agent: user })} type="button">
                        <AppIcon className="text-lg" name="edit" />
                      </button>
                      <button className="p-1 text-primary/40 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60" disabled={deleteAgentMutation.isPending} onClick={() => void handleDeleteAgent(user)} type="button">
                        <AppIcon className="text-lg" name="delete" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {userDialogState ? (
        <SettingsUserEditorDialog
          initialFormValues={initialAgentFormValues}
          isSubmitting={createAgentMutation.isPending || updateAgentMutation.isPending}
          mode={userDialogState.mode}
          onClose={() => setUserDialogState(null)}
          onSubmit={async (values) => {
            if (userDialogState.mode === "edit") {
              return await handleUpdateAgent(userDialogState.agent, values)
            }

            return await handleCreateAgent(values)
          }}
          open={Boolean(userDialogState)}
        />
      ) : null}
    </main>
  )
}
