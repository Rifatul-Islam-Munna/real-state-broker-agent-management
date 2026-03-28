"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import {
  type AgentUserOption,
  type LeadItem,
  type LeadPriority,
  type LeadStage,
  useAgentUsers,
  useConvertLeadToDeal,
  useCreateLead,
  useLeads,
  useProperties,
  useUpdateLead,
} from "@/hooks/use-real-estate-api"
import { useDispatchLeadOutreach } from "@/hooks/use-lead-outreach-api"
import { getPortalRoutes } from "@/lib/portal-routes"
import { LeadHistoryPage } from "@/components/stitch/pages/lead-history/page"
import { LeadOutreachSchedulePage } from "@/components/stitch/pages/lead-history/lead-outreach-schedule-page"

import { type LeadFormValues, Section1Section, Section2Section } from "./sections"
import type { LeadOutreachComposerValues, LeadOutreachMode } from "./sections/lead-outreach-types"

const PAGE_SIZE = 10

function mapLeadValuesToPayload(values: LeadFormValues, lead?: LeadItem) {
  return {
    agent: values.agent?.trim() ?? "",
    budget: values.budget?.trim() ?? "",
    email: values.email?.trim() ?? "",
    id: lead?.id ?? 0,
    inBoard: values.inBoard,
    interest: values.interest?.trim() ?? "",
    linkedDealId: lead?.linkedDealId ?? null,
    linkedDealTitle: lead?.linkedDealTitle ?? null,
    name: values.name?.trim() ?? "",
    notes: (values.notes ?? "")
      .split("\n")
      .map((item) => item?.trim() ?? "")
      .filter(Boolean),
    phone: values.phone?.trim() ?? "",
    priority: (values.priority ?? "Warm") as LeadPriority,
    property: values.property?.trim() ?? "",
    source: values.source?.trim() ?? "",
    stage: (values.stage ?? "New") as LeadStage,
    summary: values.summary?.trim() ?? "",
    timeline: values.timeline?.trim() ?? "",
    createdAt: lead?.createdAt ?? new Date().toISOString(),
    lastActivityAt: lead?.lastActivityAt ?? new Date().toISOString(),
    updatedAt: lead?.updatedAt ?? new Date().toISOString(),
  }
}

export function LeadCrmPipelinePage() {
  const [createDialogVersion, setCreateDialogVersion] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [localLeads, setLocalLeads] = useState<LeadItem[]>([])
  const deferredSearch = useDeferredValue(searchTerm)
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const portalRoutes = getPortalRoutes(pathname)
  const view = searchParams.get("view")

  const leadsQuery = useLeads({
    page,
    pageSize: PAGE_SIZE,
    search: deferredSearch || undefined,
  })
  const agentOptionsQuery = useAgentUsers()
  const propertyOptionsQuery = useProperties({
    page: 1,
    pageSize: 50,
    status: "Open",
  })

  const createLeadMutation = useCreateLead()
  const dispatchLeadOutreachMutation = useDispatchLeadOutreach()
  const updateLeadMutation = useUpdateLead()
  const convertLeadToDealMutation = useConvertLeadToDeal()
  const displayedLeads =
    localLeads.length > 0 || (leadsQuery.data?.items?.length ?? 0) === 0
      ? localLeads
      : leadsQuery.data?.items ?? []
  const isInitialLoading = !leadsQuery.data && (leadsQuery.isLoading || leadsQuery.isFetching)

  useEffect(() => {
    setLocalLeads(leadsQuery.data?.items ?? [])
  }, [leadsQuery.data?.items])

  async function handleCreateLead(values: LeadFormValues) {
    const response = await createLeadMutation.mutateAsync(mapLeadValuesToPayload(values))

    if (response.error) {
      return response.error.message
    }

    if (response.data) {
      setLocalLeads((current) => [response.data as LeadItem, ...current])
    }

    return null
  }

  async function handleUpdateLead(leadId: number, values: LeadFormValues) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) {
      return "Lead not found."
    }

    const response = await updateLeadMutation.mutateAsync(mapLeadValuesToPayload(values, existingLead))

    if (response.error) {
      return response.error.message
    }

    if (response.data) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === response.data?.id ? response.data ?? lead : lead)),
      )
    }

    return null
  }

  async function handleCancelLead(leadId: number, reason: string) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) {
      return "Lead not found."
    }

    return handleUpdateLead(leadId, {
      ...mapLeadValuesToPayloadToForm(existingLead),
      inBoard: false,
      notes: `${(existingLead.notes ?? []).join("\n")}\nCanceled: ${reason ?? ""}`.trim(),
      stage: "Canceled",
    })
  }

  async function handleCommunicate(leadId: number, mode: LeadOutreachMode, values: LeadOutreachComposerValues) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) {
      return "Lead not found."
    }

    const response = await dispatchLeadOutreachMutation.mutateAsync({
      leadId,
      kind: mode === "email" ? "Email" : mode === "message" ? "Sms" : "Call",
      title: values.title.trim(),
      message: values.message.trim(),
      scheduledAt: values.scheduledAt || undefined,
      createdBy: portalRoutes.kind === "agent" ? "Agent" : "Admin",
    })

    if (response.error) {
      return response.error.message
    }

    return null
  }

  async function handleSetLeadBoard(leadId: number, inBoard: boolean) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) {
      return
    }

    setLocalLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, inBoard } : lead)),
    )

    const response = await updateLeadMutation.mutateAsync({
      ...existingLead,
      inBoard,
    })

    if (response.data) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === response.data?.id ? response.data ?? lead : lead)),
      )
    }
  }

  async function handleStageChange(leadId: number, stage: LeadStage) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) {
      return
    }

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, inBoard: true, stage } : lead,
      ),
    )

    const response = await updateLeadMutation.mutateAsync({
      ...existingLead,
      inBoard: true,
      stage,
    })

    if (response.data) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === response.data?.id ? response.data ?? lead : lead)),
      )
    }
  }

  async function handleConvertLeadToDeal(leadId: number) {
    const response = await convertLeadToDealMutation.mutateAsync({ leadId })

    if (response.error) {
      return response.error.message
    }

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              inBoard: false,
              linkedDealId: response.data?.id ?? lead.linkedDealId,
              linkedDealTitle: response.data?.title ?? lead.linkedDealTitle,
              stage: "Deal",
            }
          : lead,
      ),
    )

    if (response.data?.id) {
      router.push(`${portalRoutes.deals}?dealId=${response.data.id}`)
    }

    return null
  }

  if (view === "history") {
    return <LeadHistoryPage />
  }

  if (view === "schedule") {
    return <LeadOutreachSchedulePage />
  }

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="border-b border-primary/10 bg-white px-4 py-4 dark:border-white/10 dark:bg-slate-950 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{"Lead Workspace"}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {"Open the dedicated lead timeline page to pick any lead and review the full call, SMS, email, and chat history."}
              </p>
            </div>
            <a
              className="inline-flex items-center justify-center border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              href={portalRoutes.leadHistory}
            >
              {"Open Lead History"}
            </a>
          </div>
        </div>
        <Section1Section
          onAddLeadClick={() => setCreateDialogVersion((current) => current + 1)}
          onSearchChange={(value) => {
            setSearchTerm(value)
            setPage(1)
          }}
          searchTerm={searchTerm}
        />
        <Section2Section
          agentOptions={sortAgentOptions(agentOptionsQuery.data ?? [])}
          createDialogVersion={createDialogVersion}
          currentPage={page}
          errorMessage={leadsQuery.error?.message ?? null}
          isLoading={isInitialLoading}
          isMutating={
            createLeadMutation.isPending ||
            dispatchLeadOutreachMutation.isPending ||
            updateLeadMutation.isPending ||
            convertLeadToDealMutation.isPending
          }
          leads={displayedLeads}
          onCancelLead={handleCancelLead}
          onCommunicate={handleCommunicate}
          onConvertLeadToDeal={handleConvertLeadToDeal}
          onCreateLead={handleCreateLead}
          onPageChange={setPage}
          onSetLeadBoard={handleSetLeadBoard}
          onStageChange={handleStageChange}
          onUpdateLead={handleUpdateLead}
          propertyOptions={propertyOptionsQuery.data?.items ?? []}
          totalPages={leadsQuery.data?.totalPages ?? 1}
          totalResults={leadsQuery.data?.totalCount ?? displayedLeads.length}
        />
      </div>
    </div>
  )
}

function mapLeadValuesToForm(lead: LeadItem): LeadFormValues {
  return {
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    summary: lead.summary ?? "",
    property: lead.property ?? "",
    budget: lead.budget ?? "",
    stage: lead.stage ?? "New",
    priority: lead.priority ?? "Warm",
    agent: lead.agent ?? "",
    source: lead.source ?? "",
    interest: lead.interest ?? "",
    timeline: lead.timeline ?? "",
    inBoard: lead.inBoard ?? false,
    notes: (lead.notes ?? []).join("\n"),
  }
}

function sortAgentOptions(items: AgentUserOption[]) {
  return [...items].sort((left, right) => left.fullName.localeCompare(right.fullName))
}

function mapLeadValuesToPayloadToForm(lead: LeadItem): LeadFormValues {
  return mapLeadValuesToForm(lead)
}






