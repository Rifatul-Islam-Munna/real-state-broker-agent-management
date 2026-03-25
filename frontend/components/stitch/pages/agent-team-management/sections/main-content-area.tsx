"use client"

import { useMemo, useState } from "react"

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
import { AppIcon } from "@/components/ui/app-icon"
import {
  type AgentUserOption,
  useAgentUsers,
  useCreateAgentUser,
} from "@/hooks/use-real-estate-api"

type SortKey = "created" | "listings" | "name"
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
}

const initialValues: FormValues = {
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

function validate(values: FormValues) {
  const errors: Partial<Record<keyof FormValues, string>> = {}

  if (!values.firstName.trim()) errors.firstName = "First name is required."
  if (!values.lastName.trim()) errors.lastName = "Last name is required."
  if (!values.email.trim()) errors.email = "Email is required."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address."
  }
  if (values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters."
  }
  if (values.commissionRate.trim() && parseCommissionRate(values.commissionRate) === null) {
    errors.commissionRate = "Enter a valid commission rate."
  }

  return errors
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null
}

const filterSelectClassName =
  "h-9 min-w-40 border-primary/10 bg-white px-3 text-xs dark:bg-slate-900"

function CreateAgentDialog({
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
}: {
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: FormValues) => Promise<string | null>
  open: boolean
}) {
  const [values, setValues] = useState<FormValues>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setSubmitError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setValues(initialValues)
          setErrors({})
          setSubmitError(null)
        }
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="rounded-none border border-primary/10 bg-white p-0 shadow-none dark:border-white/10 dark:bg-slate-900">
        <div className="border-b border-primary/10 px-6 py-5">
          <DialogTitle className="text-lg font-bold uppercase tracking-tight text-primary">{"Create Agent"}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {"Add a new agent directly from the team page."}
          </DialogDescription>
        </div>
        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("firstName", event.target.value)} placeholder="First name" value={values.firstName} /><FieldError error={errors.firstName} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("lastName", event.target.value)} placeholder="Last name" value={values.lastName} /><FieldError error={errors.lastName} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("email", event.target.value)} placeholder="Email" type="email" value={values.email} /><FieldError error={errors.email} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("password", event.target.value)} placeholder="Temporary password" type="password" value={values.password} /><FieldError error={errors.password} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("phone", event.target.value)} placeholder="Phone" value={values.phone} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("agencyName", event.target.value)} placeholder="Team / agency name" value={values.agencyName} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("licenseNumber", event.target.value)} placeholder="License number" value={values.licenseNumber} /></div>
          <div><Input className="rounded-none border-primary/10" onChange={(event) => setField("commissionRate", event.target.value)} placeholder="Commission rate" value={values.commissionRate} /><FieldError error={errors.commissionRate} /></div>
          <div className="md:col-span-2"><Input className="rounded-none border-primary/10" onChange={(event) => setField("avatarUrl", event.target.value)} placeholder="Avatar URL" value={values.avatarUrl} /></div>
          <div className="md:col-span-2"><Textarea className="min-h-24 rounded-none border-primary/10" onChange={(event) => setField("bio", event.target.value)} placeholder="Short bio" value={values.bio} /></div>
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
          <button className="border border-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary" onClick={() => onOpenChange(false)} type="button">{"Close"}</button>
          <button
            className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
            onClick={async () => {
              const nextErrors = validate(values)

              if (Object.keys(nextErrors).length > 0) {
                setErrors(nextErrors)
                return
              }

              const error = await onSubmit(values)
              if (error) {
                setSubmitError(error)
                return
              }

              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting ? "Creating..." : "Create Agent"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MainContentAreaSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all")
  const [sortBy, setSortBy] = useState<SortKey>("created")
  const [dialogOpen, setDialogOpen] = useState(false)

  const agentUsersQuery = useAgentUsers()
  const createAgentMutation = useCreateAgentUser()
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

  async function handleCreateAgent(values: FormValues) {
    const response = await createAgentMutation.mutateAsync({
      agencyName: values.agencyName.trim() || null,
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
    })

    if (response.error?.statusCode === 404) {
      return "POST /api/users/agents is not available on the running backend. Restart the backend to load the new agent endpoint."
    }

    return response.error?.message ?? null
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
          <button className="border border-accent bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" onClick={() => setDialogOpen(true)} type="button">{"Add New Agent"}</button>
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
            <button className="border border-primary px-4 py-2 text-xs font-bold text-primary hover:bg-primary/5" onClick={() => setDialogOpen(true)} type="button">{"Create New Agent"}</button>
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
          <div className="overflow-hidden border border-primary/10 bg-white dark:bg-slate-900">
            {isInitialLoading ? <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading agents..."}</div> : agentUsersQuery.error ? <div className="p-8 text-center text-sm font-semibold text-rose-600">{agentUsersQuery.error.message}</div> : filteredAgents.length === 0 ? <div className="p-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">{"No agents match the current filters."}</div> : (
              <table className="w-full border-collapse text-left">
                <thead><tr className="bg-primary/5 text-primary"><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"Agent"}</th><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"Agency"}</th><th className="border-b border-primary/10 px-6 py-4 text-[10px] font-bold uppercase tracking-wider">{"License"}</th><th className="border-b border-primary/10 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider">{"Listings"}</th><th className="border-b border-primary/10 px-6 py-4 text-center text-[10px] font-bold uppercase tracking-wider">{"Status"}</th><th className="border-b border-primary/10 px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">{"Commission"}</th><th className="border-b border-primary/10 px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider">{"Created"}</th></tr></thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="transition-colors hover:bg-primary/5">
                      <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center border border-primary/10 bg-primary/10 text-xs font-bold text-primary">{initials(agent)}</div><div><p className="text-sm font-bold">{agent.fullName}</p><p className="text-xs text-slate-500">{agent.email}</p><p className="text-xs text-slate-400">{displayText(agent.phone, "No phone")}</p></div></div></td>
                      <td className="px-6 py-4"><p className="text-xs font-semibold">{displayText(agent.agencyName, "Independent")}</p></td>
                      <td className="px-6 py-4"><p className="text-xs font-semibold">{displayText(agent.licenseNumber)}</p></td>
                      <td className="px-6 py-4 text-center"><p className="text-sm font-bold text-primary">{agent.propertyCount ?? 0}</p></td>
                      <td className="px-6 py-4 text-center"><div className="flex flex-col items-center gap-1"><span className={agent.isVerifiedAgent ? "inline-block bg-primary px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-white" : "inline-block border border-primary px-2 py-1 text-[10px] font-bold uppercase tracking-tighter text-primary"}>{agent.isVerifiedAgent ? "Verified" : "Agent"}</span><span className={agent.isActive === false ? "text-[10px] font-bold uppercase text-rose-600" : "text-[10px] font-bold uppercase text-green-600"}>{agent.isActive === false ? "Inactive" : "Active"}</span></div></td>
                      <td className="px-6 py-4 text-right"><p className="text-sm font-bold text-accent">{agent.commissionRate != null ? `${agent.commissionRate}%` : "N/A"}</p></td>
                      <td className="px-6 py-4 text-right"><p className="text-xs font-bold uppercase text-slate-500">{formatCreatedAt(agent.createdAt)}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <CreateAgentDialog isSubmitting={createAgentMutation.isPending} onOpenChange={setDialogOpen} onSubmit={handleCreateAgent} open={dialogOpen} />
    </main>
  )
}
