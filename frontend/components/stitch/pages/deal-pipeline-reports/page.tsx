"use client"

import { useEffect, useState } from "react"

import {
  type AgentUserOption,
  type DealItem,
  type DealStage,
  type DealType,
  useAgentUsers,
  useCreateDeal,
  useDeals,
  useLeads,
  useUpdateDeal,
} from "@/hooks/use-real-estate-api"
import { parseNumberFromValue } from "@/lib/admin-portal"

import { Section2Section } from "./sections/section-2"
import type { DealFormValues } from "./sections/deal-shared"

const PAGE_SIZE = 10

function buildDealPayload(values: DealFormValues, deal?: DealItem) {
  return {
    agent: values.agent?.trim() ?? "",
    agentId: values.agentId ? Number(values.agentId) : null,
    checklistItems: (values.checklistItems ?? "")
      .split("\n")
      .map((item, index) => {
        const trimmed = item.trim()
        const isCompleted = /^\[[xX]\]/.test(trimmed)
        return {
          isCompleted,
          sortOrder: index + 1,
          title: trimmed.replace(/^\[[ xX]\]\s*/, ""),
        }
      })
      .filter((item) => item.title.length > 0),
    client: values.client?.trim() ?? "",
    commissionAmount: parseNumberFromValue(values.commissionAmount ?? ""),
    commissionRate: parseNumberFromValue(values.commissionRate ?? "") || 3,
    commissionStatus: values.commissionStatus ?? "Estimated",
    commissionPayoutNote: values.commissionPayoutNote?.trim() ?? "",
    createdAt: deal?.createdAt ?? new Date().toISOString(),
    deadline: values.deadline?.trim() ?? "",
    expectedClosingDate: values.expectedClosingDate
      ? new Date(values.expectedClosingDate).toISOString()
      : null,
    id: deal?.id ?? 0,
    note: values.note?.trim() ?? "",
    sourceLeadId: values.sourceLeadId ? Number(values.sourceLeadId) : null,
    sourceLeadName: deal?.sourceLeadName ?? null,
    stage: (values.stage ?? "OfferMade") as DealStage,
    title: values.title?.trim() ?? "",
    type: (values.type ?? "Residential") as DealType,
    updatedAt: deal?.updatedAt ?? new Date().toISOString(),
    value: parseNumberFromValue(values.value ?? ""),
  }
}

function mapDealToFormValues(deal: DealItem): DealFormValues {
  return {
    title: deal.title ?? "",
    client: deal.client ?? "",
    value: `${deal.value ?? 0}`,
    commissionRate: `${deal.commissionRate ?? 0}`,
    commissionAmount: `${deal.commissionAmount ?? ""}`,
    commissionStatus: deal.commissionStatus ?? "Estimated",
    commissionPayoutNote: deal.commissionPayoutNote ?? "",
    stage: deal.stage ?? "OfferMade",
    type: deal.type ?? "Residential",
    deadline: deal.deadline ?? "",
    expectedClosingDate: deal.expectedClosingDate
      ? deal.expectedClosingDate.slice(0, 10)
      : "",
    note: deal.note ?? "",
    agent: deal.agent ?? "",
    agentId: deal.agentId ? `${deal.agentId}` : "",
    sourceLeadId: deal.sourceLeadId ? `${deal.sourceLeadId}` : "",
    checklistItems: (deal.checklistItems ?? [])
      .map((item) => `${item.isCompleted ? "[x]" : "[ ]"} ${item.title}`)
      .join("\n"),
  }
}

export function DealPipelineReportsPage() {
  const [page, setPage] = useState(1)
  const [localDeals, setLocalDeals] = useState<DealItem[]>([])

  const dealsQuery = useDeals({
    page,
    pageSize: PAGE_SIZE,
  })
  const agentOptionsQuery = useAgentUsers()
  const leadOptionsQuery = useLeads({
    page: 1,
    pageSize: 50,
  })

  const createDealMutation = useCreateDeal()
  const updateDealMutation = useUpdateDeal()
  const displayedDeals =
    localDeals.length > 0 || (dealsQuery.data?.items?.length ?? 0) === 0
      ? localDeals
      : dealsQuery.data?.items ?? []
  const isInitialLoading =
    !dealsQuery.data && (dealsQuery.isLoading || dealsQuery.isFetching)

  useEffect(() => {
    setLocalDeals(dealsQuery.data?.items ?? [])
  }, [dealsQuery.data?.items])

  async function handleCreateDeal(values: DealFormValues) {
    const response = await createDealMutation.mutateAsync(buildDealPayload(values))

    if (response.error) return response.error.message

    if (response.data) {
      setLocalDeals((current) => [response.data as DealItem, ...current])
    }

    return null
  }

  async function handleUpdateDeal(dealId: number, values: DealFormValues) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) return "Deal not found."

    const response = await updateDealMutation.mutateAsync(
      buildDealPayload(values, existingDeal),
    )

    if (response.error) return response.error.message

    if (response.data) {
      setLocalDeals((current) =>
        current.map((deal) =>
          deal.id === response.data?.id ? response.data ?? deal : deal,
        ),
      )
    }

    return null
  }

  async function handleCancelDeal(dealId: number, reason: string) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) return "Deal not found."

    return handleUpdateDeal(dealId, {
      ...mapDealToFormValues(existingDeal),
      note: `${existingDeal.note ?? ""}\nCanceled: ${reason ?? ""}`.trim(),
      stage: "Canceled",
    })
  }

  async function handleCommunicate(
    dealId: number,
    mode: "email" | "message",
    message: string,
  ) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) return "Deal not found."

    return handleUpdateDeal(dealId, {
      ...mapDealToFormValues(existingDeal),
      note: `${existingDeal.note ?? ""}\n${mode === "email" ? "Email" : "Message"}: ${message ?? ""}`.trim(),
    })
  }

  async function handleStageChange(dealId: number, stage: DealStage) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) return

    setLocalDeals((current) =>
      current.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)),
    )

    const response = await updateDealMutation.mutateAsync({
      ...existingDeal,
      stage,
    })

    if (response.error) {
      setLocalDeals((current) =>
        current.map((deal) => (deal.id === dealId ? existingDeal : deal)),
      )
      return
    }

    if (response.data) {
      setLocalDeals((current) =>
        current.map((deal) =>
          deal.id === response.data?.id ? response.data ?? deal : deal,
        ),
      )
    }
  }

  return (
    <div className="min-h-full bg-muted/20 text-foreground">
      <Section2Section
        agentOptions={sortAgentOptions(agentOptionsQuery.data ?? [])}
        createDialogVersion={0}
        currentPage={page}
        deals={displayedDeals}
        errorMessage={dealsQuery.error?.message ?? null}
        isLoading={isInitialLoading}
        isMutating={createDealMutation.isPending || updateDealMutation.isPending}
        leadOptions={leadOptionsQuery.data?.items ?? []}
        onCancelDeal={handleCancelDeal}
        onCommunicate={handleCommunicate}
        onCreateDeal={handleCreateDeal}
        onPageChange={setPage}
        onStageChange={handleStageChange}
        onUpdateDeal={handleUpdateDeal}
        totalPages={dealsQuery.data?.totalPages ?? 1}
        totalResults={dealsQuery.data?.totalCount ?? displayedDeals.length}
      />
    </div>
  )
}

function sortAgentOptions(items: AgentUserOption[]) {
  return [...items].sort((left, right) => left.fullName.localeCompare(right.fullName))
}
