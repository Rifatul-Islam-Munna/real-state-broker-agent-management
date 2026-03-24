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
    client: values.client?.trim() ?? "",
    commissionRate: parseNumberFromValue(values.commissionRate ?? "") || 3,
    createdAt: deal?.createdAt ?? new Date().toISOString(),
    deadline: values.deadline?.trim() ?? "",
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
    stage: deal.stage ?? "OfferMade",
    type: deal.type ?? "Residential",
    deadline: deal.deadline ?? "",
    note: deal.note ?? "",
    agent: deal.agent ?? "",
    sourceLeadId: deal.sourceLeadId ? `${deal.sourceLeadId}` : "",
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
  const isInitialLoading = !dealsQuery.data && (dealsQuery.isLoading || dealsQuery.isFetching)

  useEffect(() => {
    setLocalDeals(dealsQuery.data?.items ?? [])
  }, [dealsQuery.data?.items])

  async function handleCreateDeal(values: DealFormValues) {
    const response = await createDealMutation.mutateAsync(buildDealPayload(values))

    if (response.error) {
      return response.error.message
    }

    if (response.data) {
      setLocalDeals((current) => [response.data as DealItem, ...current])
    }

    return null
  }

  async function handleUpdateDeal(dealId: number, values: DealFormValues) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) {
      return "Deal not found."
    }

    const response = await updateDealMutation.mutateAsync(buildDealPayload(values, existingDeal))

    if (response.error) {
      return response.error.message
    }

    if (response.data) {
      setLocalDeals((current) =>
        current.map((deal) => (deal.id === response.data?.id ? response.data ?? deal : deal)),
      )
    }

    return null
  }

  async function handleCancelDeal(dealId: number, reason: string) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) {
      return "Deal not found."
    }

    return handleUpdateDeal(dealId, {
      ...mapDealToFormValues(existingDeal),
      note: `${existingDeal.note ?? ""}\nCanceled: ${reason ?? ""}`.trim(),
      stage: "Canceled",
    })
  }

  async function handleCommunicate(dealId: number, mode: "email" | "message", message: string) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) {
      return "Deal not found."
    }

    return handleUpdateDeal(dealId, {
      ...mapDealToFormValues(existingDeal),
      note: `${existingDeal.note ?? ""}\n${mode === "email" ? "Email" : "Message"}: ${message ?? ""}`.trim(),
    })
  }

  async function handleStageChange(dealId: number, stage: DealStage) {
    const existingDeal = localDeals.find((deal) => deal.id === dealId)

    if (!existingDeal) {
      return
    }

    setLocalDeals((current) =>
      current.map((deal) => (deal.id === dealId ? { ...deal, stage } : deal)),
    )

    const response = await updateDealMutation.mutateAsync({
      ...existingDeal,
      stage,
    })

    if (response.data) {
      setLocalDeals((current) =>
        current.map((deal) => (deal.id === response.data?.id ? response.data ?? deal : deal)),
      )
    }
  }

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
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
    </div>
  )
}

function sortAgentOptions(items: AgentUserOption[]) {
  return [...items].sort((left, right) => left.fullName.localeCompare(right.fullName))
}
