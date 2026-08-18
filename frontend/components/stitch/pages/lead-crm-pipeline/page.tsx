"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { LeadHistoryPage } from "@/components/stitch/pages/lead-history/page"
import { LeadOutreachSchedulePage } from "@/components/stitch/pages/lead-history/lead-outreach-schedule-page"
import {
  type AgentUserOption,
  type LeadItem,
  type LeadPriority,
  type LeadStage,
  useAgentUsers,
  useConvertLeadToDeal,
  useCreateLead,
  useDeleteLead,
  useLeads,
  useProperties,
  useUpdateLead,
} from "@/hooks/use-real-estate-api"
import { useDispatchLeadOutreach } from "@/hooks/use-lead-outreach-api"
import { getPortalRoutes } from "@/lib/portal-routes"

import type { DocumentType } from "@/@types/real-estate-api"

import {
  type LeadFormValues,
  Section1Section,
  Section2Section,
} from "./sections"
import type {
  LeadOutreachComposerValues,
  LeadOutreachMode,
} from "./sections/lead-outreach-types"

const PAGE_SIZE = 10

function buildLeadWriteFields(values: LeadFormValues) {
  return {
    agent: values.agent?.trim() ?? "",
    agentId: values.agentId ?? null,
    budget: values.budget?.trim() ?? "",
    creditScore: values.creditScore?.trim() ?? "",
    combinedCreditScore: values.combinedCreditScore?.trim() ?? "",
    monthlyEarning: values.monthlyEarning?.trim() ?? "",
    combinedMonthlyEarning: values.combinedMonthlyEarning?.trim() ?? "",
    email: values.email?.trim() ?? "",
    inBoard: values.inBoard,
    interest: values.interest?.trim() ?? "",
    name: values.name?.trim() ?? "",
    notes: (values.notes ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    phone: values.phone?.trim() ?? "",
    priority: (values.priority ?? "Warm") as LeadPriority,
    property: values.property?.trim() ?? "",
    source: values.source?.trim() ?? "",
    stage: (values.stage ?? "New") as LeadStage,
    summary: values.summary?.trim() ?? "",
    timeline: values.timeline?.trim() ?? "",
    nextActionDate: values.nextActionDate
      ? new Date(values.nextActionDate).toISOString()
      : null,
    nextActionType: values.nextActionType?.trim() ?? "",
    followUpStatus: values.followUpStatus ?? "Open",
  }
}

function buildLeadUpdatePayload(
  values: LeadFormValues,
  lead: LeadItem
): LeadItem {
  return {
    ...lead,
    ...buildLeadWriteFields(values),
  }
}

export function LeadCrmPipelinePage() {
  const [createDialogVersion, setCreateDialogVersion] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
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
    date: dateFilter || undefined,
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
  const deleteLeadMutation = useDeleteLead()
  const displayedLeads =
    localLeads.length > 0 || (leadsQuery.data?.items?.length ?? 0) === 0
      ? localLeads
      : (leadsQuery.data?.items ?? [])
  const isInitialLoading =
    !leadsQuery.data && (leadsQuery.isLoading || leadsQuery.isFetching)

  useEffect(() => {
    setLocalLeads(leadsQuery.data?.items ?? [])
  }, [leadsQuery.data?.items])

  async function handleCreateLead(values: LeadFormValues) {
    const response = await createLeadMutation.mutateAsync(
      buildLeadWriteFields(values)
    )

    if (response.error) return response.error.message

    const createdLead = response.data
    if (createdLead) {
      setLocalLeads((current) => [createdLead, ...current])
    }

    return null
  }

  async function handleUpdateLead(leadId: number, values: LeadFormValues) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) return "Lead not found."

    const response = await updateLeadMutation.mutateAsync(
      buildLeadUpdatePayload(values, existingLead)
    )

    if (response.error) return response.error.message

    const updatedLead = response.data
    if (updatedLead) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
      )
    }

    return null
  }

  async function handleCancelLead(leadId: number, reason: string) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) return "Lead not found."

    return handleUpdateLead(leadId, {
      ...mapLeadToFormValues(existingLead),
      inBoard: false,
      notes:
        `${(existingLead.notes ?? []).join("\n")}\nCanceled: ${reason ?? ""}`.trim(),
      stage: "Canceled",
    })
  }

  async function handleCommunicate(
    leadId: number,
    mode: LeadOutreachMode,
    values: LeadOutreachComposerValues
  ) {
    if (!localLeads.some((lead) => lead.id === leadId)) return "Lead not found."

    const deliveryModes: LeadOutreachMode[] = mode === "both" ? ["email", "message"] : [mode]
    for (const deliveryMode of deliveryModes) {
      const response = await dispatchLeadOutreachMutation.mutateAsync({
        leadId,
        kind: deliveryMode === "email" ? "Email" : deliveryMode === "message" ? "Sms" : "Call",
        title: values.title.trim(),
        message: values.message.trim(),
        attachmentDocumentCategory: values.attachmentDocumentCategory,
        attachmentDocumentType: (values.attachmentDocumentType ?? "") as
          | DocumentType
          | "",
        attachmentMode: values.attachmentMode,
        attachPropertyDocuments: values.attachPropertyDocuments !== false,
        mediaUrls: values.mediaUrls,
        templateId: values.templateId,
        pdfTemplateId: values.pdfTemplateId,
        scheduledAt: values.scheduledAt || undefined,
        createdBy: portalRoutes.kind === "agent" ? "Agent" : "Admin",
      })

      if (response.error) return response.error.message
      if (response.data?.status === "Failed") return response.data.summary || `${deliveryMode} could not be sent.`
    }

    setLocalLeads((current) => current.map((lead) => {
      if (lead.id !== leadId || lead.stage === "Deal" || lead.stage === "Canceled") return lead
      const isFollowUp = values.sequenceType?.startsWith("FollowUp") === true
      return {
        ...lead,
        inBoard: true,
        stage: isFollowUp ? "FollowUp" : lead.stage === "New" ? "Contacted" : lead.stage,
        lastActivityAt: values.scheduledAt ? lead.lastActivityAt : new Date().toISOString(),
      }
    }))

    return null
  }

  async function handleSetLeadBoard(leadId: number, inBoard: boolean) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) return

    setLocalLeads((current) =>
      current.map((lead) => (lead.id === leadId ? { ...lead, inBoard } : lead))
    )

    const response = await updateLeadMutation.mutateAsync({
      ...existingLead,
      inBoard,
    })

    if (response.error) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === leadId ? existingLead : lead))
      )
      return
    }

    const updatedLead = response.data
    if (updatedLead) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
      )
    }
  }

  async function handleStageChange(leadId: number, stage: LeadStage) {
    const existingLead = localLeads.find((lead) => lead.id === leadId)

    if (!existingLead) return

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === leadId ? { ...lead, inBoard: true, stage } : lead
      )
    )

    const response = await updateLeadMutation.mutateAsync({
      ...existingLead,
      inBoard: true,
      stage,
    })

    if (response.error) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === leadId ? existingLead : lead))
      )
      return
    }

    const updatedLead = response.data
    if (updatedLead) {
      setLocalLeads((current) =>
        current.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead))
      )
    }
  }

  async function handleDeleteLeads(ids: number[]) {
    if (!ids.length) return null
    const response = await deleteLeadMutation.mutateAsync({ ids })
    if (response.error) return response.error.message
    const deletedIds = new Set(
      Array.isArray(response.data?.deleted)
        ? response.data.deleted
        : ids,
    )
    setLocalLeads((current) =>
      current.filter((lead) => !deletedIds.has(lead.id))
    )
    return null
  }

  async function handleConvertLeadToDeal(leadId: number) {
    const response = await convertLeadToDealMutation.mutateAsync({ leadId })

    if (response.error) return response.error.message

    const convertedDeal = response.data
    if (!convertedDeal) return "The deal was not returned by the server."

    setLocalLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              inBoard: false,
              linkedDealId: convertedDeal.id,
              linkedDealTitle: convertedDeal.title,
              stage: "Deal",
            }
          : lead
      )
    )

    router.push(`${portalRoutes.deals}?dealId=${convertedDeal.id}`)
    return null
  }

  if (view === "history") return <LeadHistoryPage />
  if (view === "schedule") return <LeadOutreachSchedulePage />

  return (
    <div className="min-h-full bg-muted/20 text-foreground">
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
        dateFilter={dateFilter}
        errorMessage={leadsQuery.error?.message ?? null}
        isLoading={isInitialLoading}
        isMutating={
          createLeadMutation.isPending ||
          dispatchLeadOutreachMutation.isPending ||
          updateLeadMutation.isPending ||
          convertLeadToDealMutation.isPending
        }
        leads={displayedLeads}
        onDateFilterChange={(value) => {
          setDateFilter(value)
          setPage(1)
        }}
        onDeleteLeads={handleDeleteLeads}
        onSearchChange={(value) => {
          setSearchTerm(value)
          setPage(1)
        }}
        searchTerm={searchTerm}
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
  )
}

function mapLeadToFormValues(lead: LeadItem): LeadFormValues {
  return {
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    summary: lead.summary ?? "",
    property: lead.property ?? "",
    budget: lead.budget ?? "",
    creditScore: lead.creditScore ?? "",
    combinedCreditScore: lead.combinedCreditScore ?? "",
    monthlyEarning: lead.monthlyEarning ?? "",
    combinedMonthlyEarning: lead.combinedMonthlyEarning ?? "",
    stage: lead.stage ?? "New",
    priority: lead.priority ?? "Warm",
    agent: lead.agent ?? "",
    agentId: lead.agentId ?? null,
    source: lead.source ?? "",
    interest: lead.interest ?? "",
    timeline: lead.timeline ?? "",
    inBoard: lead.inBoard ?? false,
    nextActionDate: lead.nextActionDate ? lead.nextActionDate.slice(0, 16) : "",
    nextActionType: lead.nextActionType ?? "",
    followUpStatus: lead.followUpStatus ?? "Open",
    notes: (lead.notes ?? []).join("\n"),
  }
}

function sortAgentOptions(items: AgentUserOption[]) {
  return [...items].sort((left, right) =>
    left.fullName.localeCompare(right.fullName)
  )
}
