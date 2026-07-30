"use client"

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { DealItem } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

import { formatDealValue } from "./deal-shared"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

export function DealActions({
  deal,
  leadHref,
  onDialogOpen,
}: {
  deal: DealItem
  leadHref: string
  onDialogOpen: (
    type: "cancel" | "edit" | "email" | "message",
    dealId: number,
  ) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {deal.sourceLeadId ? (
        <Button render={<Link href={leadHref} />} size="sm">
          <AppIcon name="person_search" />
          {"Open lead"}
        </Button>
      ) : null}
      <Button
        onClick={() => onDialogOpen("email", deal.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="mail" />
        {"Email"}
      </Button>
      <Button
        onClick={() => onDialogOpen("message", deal.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="chat" />
        {"Message"}
      </Button>
      <Button
        onClick={() => onDialogOpen("edit", deal.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="edit" />
        {"Edit"}
      </Button>
      {deal.stage !== "Canceled" ? (
        <Button
          onClick={() => onDialogOpen("cancel", deal.id)}
          size="sm"
          type="button"
          variant="destructive"
        >
          <AppIcon name="block" />
          {"Cancel"}
        </Button>
      ) : null}
    </div>
  )
}

export function DealKanbanCard({
  deal,
  isActive,
  onOpen,
}: {
  deal: DealItem
  isActive: boolean
  onOpen: (dealId: number) => void
}) {
  return (
    <Card
      className={cn(
        "group overflow-hidden rounded-xl border-0 bg-white py-0 shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]",
        isActive && "ring-2 ring-[var(--ether-primary)]/25",
      )}
      size="sm"
    >
      <CardHeader className="flex flex-row items-start justify-between border-0 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <Badge className="rounded-md bg-[var(--ether-surface-container)] px-2 py-1 text-[10px] font-semibold text-[var(--ether-on-surface-variant)]" variant="secondary">{deal.type}</Badge>
          <CardTitle className="mt-3 line-clamp-2 text-lg font-bold text-[var(--ether-on-surface)]">{deal.title}</CardTitle>
        </div>
        <Button
          aria-label="Drag deal"
          className="drag-handle cursor-grab active:cursor-grabbing"
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <AppIcon name="drag_indicator" />
        </Button>
      </CardHeader>
      <Button
        className="h-auto w-full justify-start rounded-none p-0 text-left hover:bg-[var(--ether-surface-container-low)]"
        onClick={() => onOpen(deal.id)}
        type="button"
        variant="ghost"
      >
        <CardContent className="w-full p-4">
          <p className="text-sm font-bold text-[var(--ether-on-surface)]">
            {displayText(deal.client, "Client not set")}
          </p>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--ether-on-surface-variant)]">
            {displayText(deal.note, "No deal note yet.")}
          </p>
          <Separator className="my-3" />
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--ether-on-surface-variant)]">
            <span className="font-semibold text-foreground">
              {formatDealValue(deal.value)}
            </span>
            <span className="truncate">
              {deal.expectedClosingDate
                ? formatDateTimeLabel(deal.expectedClosingDate)
                : displayText(deal.deadline)}
            </span>
          </div>
        </CardContent>
      </Button>
    </Card>
  )
}
