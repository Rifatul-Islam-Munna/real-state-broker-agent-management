"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type AgentRoutePermission, agentRouteAccessItems } from "@/lib/agent-route-access"
import { AppIcon } from "@/components/ui/app-icon"
import {
  type AgentUserOption,
  useAgentUsers,
  useCreateAgentUser,
  useDeleteAgentUser,
  useUpdateAgentUser,
} from "@/hooks/use-real-estate-api"

type SortKey = "created" | "listings" | "name"
type AccessMode = "full" | "custom"
type AgentDialogState =
  | { mode: "create" }
  | { mode: "edit"; agent: AgentUserOption }
  | null

type FormValues = {
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

const initialValues: FormValues = {
  accessMode: "full",
  agentRoutePermissions: [],
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  agencyName: "",
  licenseNumber: "",
  commissionRate: "",
  avatarUrl: "",
  bio: "",
  isVerifiedAgent: false,
  isActive: true,
}

type FormErrors = Partial<Record<keyof FormValues | "form", string>>

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

function initials(agent: AgentUserOption) {
  const parts = (agent.fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

function formatCreatedAt(value?: string) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString()
}

function parseCommissionRate(value: string) {
  const numericValue = Number.parseFloat(value.trim())
  return Number.isFinite(numericValue) ? numericValue : null
}

const agentRouteLabelMap = new Map<AgentRoutePermission, string>(
  agentRouteAccessItems.map((item) => [item.permission, item.label] as const),
)

function formatAccessSummary(agent: AgentUserOption) {
  return agent.hasCustomAgentRoutePermissions ? "Custom Access" : "Full Access"
}

function formatAccessDetails(agent: AgentUserOption) {
  if (!agent.hasCustomAgentRoutePermissions) {
    return "All agent portal routes"
  }

  const labels = (agent.agentRoutePermissions ?? [])
    .map((permission) => agentRouteLabelMap.get(permission as AgentRoutePermission) ?? permission)
    .filter(Boolean)

  return labels.length > 0 ? labels.join(", ") : "No routes selected"
}

function buildInitialValues(agent?: AgentUserOption | null): FormValues {
  if (!agent) {
    return initialValues
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

function validate(values: FormValues, mode: "create" | "edit") {
  const errors: FormErrors = {}

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

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null
}

const filterSelectClassName =
  "h-9 min-w-40 border-primary/10 bg-white px-3 text-xs dark:bg-slate-900"

function AgentAccessFields({
  errors,
  onAccessModeChange,
  onTogglePermission,
  values,
}: {
  errors: FormErrors
  onAccessModeChange: (value: AccessMode) => void
  onTogglePermission: (permission: string) => void
  values: FormValues
}) {
  return (
    <div className="space-y-4 border border-primary/10 bg-primary/5 p-4 md:col-span-2">
      <div className="space-y-1">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">{"Permission Access"}</p>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          {"Choose whether the agent gets the full portal or only selected routes when the account is created or edited."}
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
            <FieldError error={errors.agentRoutePermissions} />
          </div>
        ) : (
          <div className="flex items-center border border-dashed border-primary/20 bg-white px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {"This agent can open every current agent portal route."}
          </div>
        )}
      </div>
    </div>
  )
}

function AgentEditorDialog({
  initialFormValues,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
}: {
  initialFormValues: FormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: FormValues) => Promise<string | null>
  open: boolean
}) {
  const [values, setValues] = useState<FormValues>(initialFormValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setValues(initialFormValues)
    setErrors({})
    setSubmitError(null)
  }, [initialFormValues, open])

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
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
            {mode === "create" ? "Create Agent" : "Edit Agent"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === "create"
              ? "Add a new agent directly from the team page, including route permissions."
              : "Update the agent profile, login status, and route permissions anytime."}
          </DialogDescription>
        </div>
        <form
          className="flex min-h-0 flex-col"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validate(values, mode)

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
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" value={values.firstName} /><FieldError error={errors.firstName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" value={values.lastName} /><FieldError error={errors.lastName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("email", event.target.value)} placeholder="Email" type="email" value={values.email} /><FieldError error={errors.email} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("password", event.target.value)} placeholder={mode === "create" ? "Temporary password" : "New password (optional)"} type="password" value={values.password} /><FieldError error={errors.password} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("phone", event.target.value)} placeholder="Phone" value={values.phone} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("agencyName", event.target.value)} placeholder="Team / agency name" value={values.agencyName} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("licenseNumber", event.target.value)} placeholder="License number" value={values.licenseNumber} /></div>
            <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("commissionRate", event.target.value)} placeholder="Commission rate" value={values.commissionRate} /><FieldError error={errors.commissionRate} /></div>
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
              {isSubmitting ? mode === "create" ? "Creating..." : "Saving..." : mode === "create" ? "Create Agent" : "Save Agent"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MainContentAreaSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all")
  const [sortBy, setSortBy] = useState<SortKey>("created")
  const [dialogState, setDialogState] = useState<AgentDialogState>(null)

  const agentUsersQuery = useAgentUsers({ includeInactive: true })
  const createAgentMutation = useCreateAgentUser()
  const updateAgentMutation = useUpdateAgentUser()
  const deleteAgentMutation = useDeleteAgentUser()
  const isInitialLoading = !agentUsersQuery.data && (agentUsersQuery.isLoading || agentUsersQuery.isFetching)
  const agents = agentUsersQuery.data ?? []

  const filteredAgents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return [...agents]
      .filter((agent) => {
        const matchesSearch =
          normalizedSearch.length === 0 ||
          (agent.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
          (agent.email ?? "").toLowerCase().includes(normalizedSearch) ||
          (agent.phone ?? "").toLowerCase().includes(normalizedSearch) ||
          (agent.agencyName ?? "").toLowerCase().includes(normalizedSearch)

        if (!matchesSearch) return false
        if (verificationFilter === "verified") return agent.isVerifiedAgent
        if (verificationFilter === "unverified") return !agent.isVerifiedAgent
        return true
      })
      .sort((left, right) => {
        if (sortBy === "name") return (left.fullName ?? "").localeCompare(right.fullName ?? "")
        if (sortBy === "listings") return (right.propertyCount ?? 0) - (left.propertyCount ?? 0)
        return new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
      })
  }, [agents, searchTerm, sortBy, verificationFilter])

  const teamGroups = useMemo(() => {
    const groups = new Map<string, AgentUserOption[]>()
    agents.forEach((agent) => {
      const key = displayText(agent.agencyName, "Independent Agents")
      groups.set(key, [...(groups.get(key) ?? []), agent])
    })
    return Array.from(groups.entries())
      .map(([name, members]) => ({ name, members, listingCount: members.reduce((sum, item) => sum + (item.propertyCount ?? 0), 0) }))
      .sort((left, right) => right.members.length - left.members.length)
  }, [agents])

  const initialFormValues = useMemo(() => {
    if (dialogState?.mode === "edit") {
      return buildInitialValues(dialogState.agent)
    }

    return initialValues
  }, [dialogState])

  async function handleCreateAgent(values: FormValues) {
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

  async function handleUpdateAgent(agent: AgentUserOption, values: FormValues) {
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
    <main className="flex min-h-screen flex-1 flex-col overflow-y-auto">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-primary/10 bg-white px-8 dark:bg-slate-900">
        <h2 className="text-lg font-bold uppercase tracking-tight text-primary">{"Agent & Team Management"}</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-secondary" name="search" />
            <Input className="w-64 border border-primary/10 bg-background-light py-2 pl-10 pr-4 text-sm focus-visible:ring-primary/20 dark:bg-slate-800" onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search agents or teams..." type="text" value={searchTerm} />
          </div>
          <button className="border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" onClick={() => setDialogState({ mode: "create" })} type="button">{"Add New Agent"}</button>
        </div>
      </header>

      <div className="space-y-8 p-8">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="border border-primary/10 bg-white p-6 dark:bg-slate-900"><p className="mb-2 text-xs font-bold uppercase text-secondary">{"Total Agents"}</p><span className="text-3xl font-bold text-primary">{agents.length}</span></div>
          <div className="border border-primary/10 bg-white p-6 dark:bg-slate-900"><p className="mb-2 text-xs font-bold uppercase text-secondary">{"Active Teams"}</p><span className="text-3xl font-bold text-primary">{teamGroups.length}</span></div>
          <div className="border border-primary/10 bg-white p-6 dark:bg-slate-900"><p className="mb-2 text-xs font-bold uppercase text-secondary">{"Total Listings"}</p><span className="text-3xl font-bold text-primary">{agents.reduce((sum, item) => sum + (item.propertyCount ?? 0), 0)}</span></div>
          <div className="border border-primary/10 bg-white p-6 dark:bg-slate-900"><p className="mb-2 text-xs font-bold uppercase text-secondary">{"Verified Agents"}</p><span className="text-3xl font-bold text-primary">{agents.filter((item) => item.isVerifiedAgent).length}</span></div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="border-l-4 border-accent pl-3 text-sm font-bold uppercase tracking-widest text-primary">{"Team Structure"}</h3>
            <button className="border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5" onClick={() => setDialogState({ mode: "create" })} type="button">{"Create New Agent"}</button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {teamGroups.length > 0 ? teamGroups.slice(0, 6).map((group) => (
              <div key={group.name} className="border border-primary/10 bg-white dark:bg-slate-900">
                <div className="border-b border-primary/5 bg-primary/5 p-5">
                  <h4 className="font-bold text-primary">{group.name}</h4>
                  <p className="mt-1 text-xs text-secondary">{`${group.members.length} agents • ${group.listingCount} listings`}</p>
                </div>
                <div className="p-5">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 4).map((agent) => (
                      <div key={agent.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary/10 text-[10px] font-bold text-primary dark:border-slate-900">{initials(agent)}</div>
                    ))}
                    {group.members.length > 4 ? <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary/20 text-[10px] font-bold text-primary dark:border-slate-900">{`+${group.members.length - 4}`}</div> : null}
                  </div>
                </div>
              </div>
            )) : <div className="border border-primary/10 bg-white p-6 text-sm font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400 md:col-span-3">{"No team data is available yet."}</div>}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="border-l-4 border-accent pl-3 text-sm font-bold uppercase tracking-widest text-primary">{"Agent Directory"}</h3>
            <div className="flex items-center gap-2">
              <Select modal={false} onValueChange={(value) => setVerificationFilter(value as typeof verificationFilter)} value={verificationFilter}>
                <SelectTrigger className={filterSelectClassName}>
                  <SelectValue placeholder="All Agents" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"All Agents"}</SelectItem>
                  <SelectItem value="verified">{"Verified Only"}</SelectItem>
                  <SelectItem value="unverified">{"Unverified Only"}</SelectItem>
                </SelectContent>
              </Select>
              <Select modal={false} onValueChange={(value) => setSortBy(value as SortKey)} value={sortBy}>
                <SelectTrigger className={filterSelectClassName}>
                  <SelectValue placeholder="Sort by Newest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">{"Sort by Newest"}</SelectItem>
                  <SelectItem value="name">{"Sort by Name"}</SelectItem>
                  <SelectItem value="listings">{"Sort by Listings"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto border border-primary/10 bg-white dark:bg-slate-900">
            {isInitialLoading ? <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading agents..."}</div> : agentUsersQuery.error ? <div className="p-8 text-center text-sm font-semibold text-rose-600">{agentUsersQuery.error.message}</div> : filteredAgents.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{"No agents match the current filters."}</div> : (
              <table className="w-full min-w-[1200px] border-collapse text-left">
                <thead><tr className="bg-primary/5 text-primary"><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"Agent"}</th><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"Agency"}</th><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"License"}</th><th className="border-b border-primary/10 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider">{"Listings"}</th><th className="border-b border-primary/10 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider">{"Status"}</th><th className="border-b border-primary/10 px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">{"Commission"}</th><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"Access"}</th><th className="border-b border-primary/10 px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">{"Created"}</th><th className="border-b border-primary/10 px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">{"Actions"}</th></tr></thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="transition-colors hover:bg-primary/5">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border border-primary/10 bg-primary/10 text-xs font-bold text-primary">{initials(agent)}</div><div><p className="text-sm font-bold">{agent.fullName}</p><p className="text-xs text-slate-500">{agent.email}</p><p className="text-xs text-slate-400">{displayText(agent.phone, "No phone")}</p></div></div></td>
                      <td className="px-6 py-4"><p className="text-xs font-semibold">{displayText(agent.agencyName, "Independent")}</p></td>
                      <td className="px-6 py-4"><p className="text-xs font-semibold">{displayText(agent.licenseNumber)}</p></td>
                      <td className="px-6 py-4 text-center"><p className="text-sm font-bold text-primary">{agent.propertyCount ?? 0}</p></td>
                      <td className="px-6 py-4 text-center"><div className="flex flex-col items-center gap-1"><span className={agent.isVerifiedAgent ? "inline-block bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-white" : "inline-block border border-primary px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-primary"}>{agent.isVerifiedAgent ? "Verified" : "Agent"}</span><span className={agent.isActive === false ? "text-[10px] font-bold uppercase text-rose-600" : "text-[10px] font-bold uppercase text-green-600"}>{agent.isActive === false ? "Inactive" : "Active"}</span></div></td>
                      <td className="px-6 py-4 text-right"><p className="text-sm font-bold text-accent">{agent.commissionRate != null ? `${agent.commissionRate}%` : "N/A"}</p></td>
                      <td className="px-6 py-4"><div className="space-y-2"><p className={agent.hasCustomAgentRoutePermissions ? "text-[10px] font-bold uppercase tracking-[0.18em] text-accent" : "text-[10px] font-bold uppercase tracking-[0.18em] text-primary"}>{formatAccessSummary(agent)}</p><p className="max-w-xs text-xs leading-5 text-slate-500">{formatAccessDetails(agent)}</p></div></td>
                      <td className="px-6 py-4 text-right"><p className="text-xs font-bold uppercase text-slate-500">{formatCreatedAt(agent.createdAt)}</p></td>
                      <td className="px-6 py-4"><div className="flex justify-end gap-2"><button className="border border-primary/15 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary transition-colors hover:border-primary hover:bg-primary/5" onClick={() => setDialogState({ mode: "edit", agent })} type="button">{"Edit"}</button><button className="border border-rose-200 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70" disabled={deleteAgentMutation.isPending} onClick={() => void handleDeleteAgent(agent)} type="button">{"Delete"}</button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {dialogState ? (
        <AgentEditorDialog
          initialFormValues={initialFormValues}
          isSubmitting={createAgentMutation.isPending || updateAgentMutation.isPending}
          mode={dialogState.mode}
          onClose={() => setDialogState(null)}
          onSubmit={async (values) => {
            if (dialogState.mode === "edit") {
              return await handleUpdateAgent(dialogState.agent, values)
            }

            return await handleCreateAgent(values)
          }}
          open={Boolean(dialogState)}
        />
      ) : null}
    </main>
  )
}
