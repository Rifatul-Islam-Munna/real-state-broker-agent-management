"use client"

import Link from "next/link"

import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { LeadItem } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel, formatRelativeTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

function displayText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

export function LeadActions({
  dealHref,
  historyHref,
  lead,
  onConvertLeadToDeal,
  onDialogOpen,
  onToggleBoard,
}: {
  dealHref: string
  historyHref: string
  lead: LeadItem
  onConvertLeadToDeal: (leadId: number) => Promise<string | null>
  onDialogOpen: (
    type: "cancel" | "edit" | "email" | "message" | "call",
    leadId: number,
  ) => void
  onToggleBoard: (leadId: number, inBoard: boolean) => Promise<void>
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => void onToggleBoard(lead.id, !lead.inBoard)}
        size="sm"
        type="button"
        variant={lead.inBoard ? "secondary" : "outline"}
      >
        <AppIcon name={lead.inBoard ? "remove_from_queue" : "view_kanban"} />
        {lead.inBoard ? "Remove from board" : "Add to board"}
      </Button>
      {lead.linkedDealId ? (
        <Button
          render={<Link href={`${dealHref}?dealId=${lead.linkedDealId}`} />}
          size="sm"
        >
          <AppIcon name="contract" />
          {"Open deal"}
        </Button>
      ) : (
        <Button
          onClick={() => void onConvertLeadToDeal(lead.id)}
          size="sm"
          type="button"
        >
          <AppIcon name="add_business" />
          {"Create deal"}
        </Button>
      )}
      <Button render={<Link href={historyHref} />} size="sm" variant="outline">
        <AppIcon name="history" />
        {"History"}
      </Button>
      <Button
        onClick={() => onDialogOpen("email", lead.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="mail" />
        {"Email"}
      </Button>
      <Button
        onClick={() => onDialogOpen("message", lead.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="chat" />
        {"Message"}
      </Button>
      <Button
        onClick={() => onDialogOpen("call", lead.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="call" />
        {"Call"}
      </Button>
      <Button
        onClick={() => onDialogOpen("edit", lead.id)}
        size="sm"
        type="button"
        variant="outline"
      >
        <AppIcon name="edit" />
        {"Edit"}
      </Button>
      {lead.stage !== "Canceled" ? (
        <Button
          onClick={() => onDialogOpen("cancel", lead.id)}
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

export function LeadKanbanCard({
  isActive,
  lead,
  onOpen,
}: {
  isActive: boolean
  lead: LeadItem
  onOpen: (leadId: number) => void
}) {
  const lastActivityLabel = formatRelativeTimeLabel(
    lead.lastActivityAt ?? lead.updatedAt ?? lead.createdAt ?? new Date().toISOString(),
  )

  return (
    <Card
      className={cn(
        "gap-0 overflow-hidden py-0 shadow-xs",
        isActive && "border-primary ring-2 ring-primary/10",
      )}
      size="sm"
    >
      <CardHeader className="flex flex-row items-start justify-between border-b py-3">
        <div className="min-w-0">
          <CardTitle className="line-clamp-1 text-sm">{lead.name}</CardTitle>
          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {displayText(lead.property, "No property selected")}
          </p>
        </div>
        <Button
          aria-label="Drag lead"
          className="drag-handle cursor-grab active:cursor-grabbing"
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <AppIcon name="drag_indicator" />
        </Button>
      </CardHeader>
      <Button
        className="h-auto w-full justify-start rounded-none p-0 text-left hover:bg-muted/35"
        onClick={() => onOpen(lead.id)}
        type="button"
        variant="ghost"
      >
        <CardContent className="w-full p-4">
          <p className="text-sm font-semibold">
            {displayText(lead.budget, "Budget not set")}
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {displayText(lead.summary, "No summary yet.")}
          </p>
          <Separator className="my-3" />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="truncate font-medium">
              {displayText(lead.agent, "No agent assigned")}
            </span>
            <span>{lastActivityLabel}</span>
          </div>
          {lead.nextActionDate ? (
            <Badge
              className="mt-3 h-auto w-full justify-start whitespace-normal py-2"
              variant={lead.isFollowUpOverdue ? "destructive" : "outline"}
            >
              {lead.isFollowUpOverdue ? "Overdue: " : "Next: "}
              {`${displayText(lead.nextActionType, "Follow up")} ${formatDateTimeLabel(lead.nextActionDate)}`}
            </Badge>
          ) : null}
        </CardContent>
      </Button>
    </Card>
  )
}
