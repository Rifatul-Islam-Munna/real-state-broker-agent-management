"use client"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { DealItem } from "@/hooks/use-real-estate-api"
import { formatCommissionLabel, formatDateTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

import { DealActions } from "./deal-card-components-v2"
import { dealStageMeta, formatDealValue } from "./deal-shared"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

function DetailItem({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-lg border border-[var(--ether-outline-variant)]/50 bg-[var(--ether-surface-container-low)]/60 p-3">
      <p className="ether-label-caps text-[9px] text-[var(--ether-outline)]">
        {label}
      </p>
      <p className={cn("mt-1 text-sm font-bold text-[var(--ether-on-surface)]", valueClassName)}>{value}</p>
    </div>
  )
}

export function DealDetailsPanel({
  deal,
  leadHref,
  onClose,
  onDialogOpen,
}: {
  deal: DealItem
  leadHref: string
  onClose: () => void
  onDialogOpen: (
    type: "cancel" | "edit" | "email" | "message",
    dealId: number,
  ) => void
}) {
  const linkedLeadLabel = displayText(deal.sourceLeadName, "No linked lead")

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-[var(--ether-outline-variant)] px-6 py-4">
        <div className="min-w-0">
          <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">
            {"Deal details"}
          </p>
          <h2 className="mt-1 truncate text-xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">
            {deal.title}
          </h2>
        </div>
        <Button onClick={onClose} size="sm" type="button" variant="outline">
          <AppIcon name="close" />
          {"Close"}
        </Button>
      </div>

      <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto bg-[color-mix(in_srgb,var(--ether-surface)_55%,white)] p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Badge>{dealStageMeta[deal.stage].label}</Badge>
                <CardDescription className="mt-3 max-w-3xl">
                  {displayText(deal.note, "No deal note yet.")}
                </CardDescription>
              </div>
              <Badge variant="outline">{deal.type}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <DealActions
              deal={deal}
              leadHref={leadHref}
              onDialogOpen={onDialogOpen}
            />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Client" value={displayText(deal.client)} />
              <DetailItem
                label="Agent"
                value={displayText(deal.agent, "No agent assigned")}
              />
              <DetailItem label="Value" value={formatDealValue(deal.value)} />
              <DetailItem
                label="Commission"
                value={
                  deal.commissionAmount > 0
                    ? formatDealValue(deal.commissionAmount)
                    : formatCommissionLabel(deal.value, deal.commissionRate)
                }
                valueClassName="text-primary"
              />
              <DetailItem label="Deadline" value={displayText(deal.deadline)} />
              <DetailItem
                label="Expected closing"
                value={
                  deal.expectedClosingDate
                    ? formatDateTimeLabel(deal.expectedClosingDate)
                    : "Not set"
                }
              />
              <DetailItem label="Linked lead" value={linkedLeadLabel} />
              <DetailItem
                label="Commission status"
                value={`${deal.commissionStatus ?? "Pending"}`.replace(/([A-Z])/g, " $1").trim()}
              />
            </div>
          </CardContent>
        </Card>

        {deal.checklistItems?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>{"Deal checklist"}</CardTitle>
              <CardDescription>
                {"Completion status for the current transaction workflow."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deal.checklistItems.map((item) => (
                <div
                  className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3 text-sm"
                  key={`${deal.id}-check-${item.id ?? item.sortOrder}`}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                      item.isCompleted
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.isCompleted ? <AppIcon name="check" /> : null}
                  </span>
                  <span>{item.title}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{"Deal activity"}</CardTitle>
            <CardDescription>{"Creation and latest stage update."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-semibold">{"Deal created"}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ether-on-surface-variant)]">
                {displayText(deal.note, "No deal note yet.")}
              </p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {formatDateTimeLabel(deal.createdAt)}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="font-semibold">{"Last update"}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--ether-on-surface-variant)]">
                {`Stage is ${dealStageMeta[deal.stage].label}.`}
              </p>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {formatDateTimeLabel(deal.updatedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
