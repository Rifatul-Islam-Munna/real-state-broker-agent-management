"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  type AgentUserOption,
  useAgentUsers,
  useCreateAgentUser,
  useDeleteAgentUser,
  useUpdateAgentUser,
} from "@/hooks/use-real-estate-api"

import { AgentDirectory } from "./agent-directory-v2"
import { AgentEditorDialog } from "./agent-editor-dialog-v2"
import {
  type AgentDialogState,
  type AgentFormValues,
  buildAgentInitialValues,
  displayAgentText,
  initialAgentValues,
  parseCommissionRate,
  type SortKey,
} from "./agent-team-shared"
import { AgentTeamOverview } from "./agent-team-overview-v2"

export function MainContentAreaSection() {
  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | "verified" | "unverified"
  >("all")
  const [sortBy, setSortBy] = useState<SortKey>("created")
  const [dialogState, setDialogState] = useState<AgentDialogState>(null)
  const [pendingDeleteAgent, setPendingDeleteAgent] = useState<AgentUserOption | null>(null)

  const agentUsersQuery = useAgentUsers({ includeInactive: true })
  const createAgentMutation = useCreateAgentUser()
  const updateAgentMutation = useUpdateAgentUser()
  const deleteAgentMutation = useDeleteAgentUser()
  const isInitialLoading =
    !agentUsersQuery.data &&
    (agentUsersQuery.isLoading || agentUsersQuery.isFetching)
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
        if (sortBy === "name") {
          return (left.fullName ?? "").localeCompare(right.fullName ?? "")
        }
        if (sortBy === "listings") {
          return (right.propertyCount ?? 0) - (left.propertyCount ?? 0)
        }
        return (
          new Date(right.createdAt ?? 0).getTime() -
          new Date(left.createdAt ?? 0).getTime()
        )
      })
  }, [agents, searchTerm, sortBy, verificationFilter])

  const teamGroups = useMemo(() => {
    const groups = new Map<string, AgentUserOption[]>()
    agents.forEach((agent) => {
      const key = displayAgentText(agent.agencyName, "Independent agents")
      groups.set(key, [...(groups.get(key) ?? []), agent])
    })

    return Array.from(groups.entries())
      .map(([name, members]) => ({
        name,
        members,
        listingCount: members.reduce(
          (sum, item) => sum + (item.propertyCount ?? 0),
          0,
        ),
      }))
      .sort((left, right) => right.members.length - left.members.length)
  }, [agents])

  const initialFormValues = useMemo(() => {
    if (dialogState?.mode === "edit") {
      return buildAgentInitialValues(dialogState.agent)
    }
    return initialAgentValues
  }, [dialogState])

  async function handleCreateAgent(values: AgentFormValues) {
    const response = await createAgentMutation.mutateAsync({
      agencyName: values.agencyName.trim() || null,
      agentRoutePermissions:
        values.accessMode === "custom" ? values.agentRoutePermissions : [],
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

  async function handleUpdateAgent(
    agent: AgentUserOption,
    values: AgentFormValues,
  ) {
    const response = await updateAgentMutation.mutateAsync({
      agencyName: values.agencyName.trim() || null,
      agentRoutePermissions:
        values.accessMode === "custom" ? values.agentRoutePermissions : [],
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
    await deleteAgentMutation.mutateAsync({ id: `${agent.id}` })
    setPendingDeleteAgent(null)
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <AgentTeamOverview
          agents={agents}
          onAddAgent={() => setDialogState({ mode: "create" })}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          teamGroups={teamGroups}
        />
        <AgentDirectory
          agents={filteredAgents}
          errorMessage={agentUsersQuery.error?.message ?? null}
          isDeleting={deleteAgentMutation.isPending}
          isLoading={isInitialLoading}
          onDelete={setPendingDeleteAgent}
          onEdit={(agent) => setDialogState({ mode: "edit", agent })}
          onSortChange={setSortBy}
          onVerificationFilterChange={setVerificationFilter}
          sortBy={sortBy}
          verificationFilter={verificationFilter}
        />
      </div>

      {dialogState ? (
        <AgentEditorDialog
          initialFormValues={initialFormValues}
          isSubmitting={
            createAgentMutation.isPending || updateAgentMutation.isPending
          }
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

      <Dialog
        open={Boolean(pendingDeleteAgent)}
        onOpenChange={(open) => (!open ? setPendingDeleteAgent(null) : undefined)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{"Remove agent"}</DialogTitle>
            <DialogDescription>
              {pendingDeleteAgent
                ? `Remove ${pendingDeleteAgent.fullName} from active lists and clear current property assignments?`
                : "This action changes the agent account and assignments."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setPendingDeleteAgent(null)}
              type="button"
              variant="outline"
            >
              {"Cancel"}
            </Button>
            <Button
              disabled={deleteAgentMutation.isPending}
              onClick={() =>
                pendingDeleteAgent
                  ? void handleDeleteAgent(pendingDeleteAgent)
                  : undefined
              }
              type="button"
              variant="destructive"
            >
              {deleteAgentMutation.isPending ? "Removing..." : "Remove agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
