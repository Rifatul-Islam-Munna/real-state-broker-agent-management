"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { LeadOutreachScheduleItem, LeadStage } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLeadOutreachSchedule, useMarkLeadRepliesRead } from "@/hooks/use-lead-outreach-api"
import { formatDateTimeLabel, formatLeadStage, leadStageOrder } from "@/lib/admin-portal"

type ReadFilter = "all" | "unread" | "read"
type ChannelFilter = "all" | "Email" | "Sms"

const pageSize = 18

function displayText(value?: string | null, fallback = "Not set") {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : fallback
}

function formatChannel(item: LeadOutreachScheduleItem) {
  return item.kind === "MailInbox" ? "Email" : item.kind === "Sms" ? "SMS" : item.kind
}

function replyTime(item: LeadOutreachScheduleItem) {
  return item.occurredAt ?? item.createdAt
}

function leadHref(leadId: number) {
  return `/dashboard/lead-history?leadId=${leadId}`
}

function activityHref(leadId: number) {
  return `/dashboard/lead-schedule?leadId=${leadId}`
}

export function ReplyInboxPage() {
  const [search, setSearch] = useState("")
  const [readFilter, setReadFilter] = useState<ReadFilter>("unread")
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all")
  const [stageFilter, setStageFilter] = useState<"" | LeadStage>("")
  const [page, setPage] = useState(1)
  const [selectedReply, setSelectedReply] = useState<LeadOutreachScheduleItem | null>(null)

  const repliesQuery = useLeadOutreachSchedule({ status: "Received" })
  const markRead = useMarkLeadRepliesRead()

  const replies = useMemo(
    () => (repliesQuery.data ?? []).filter((item) => item.direction === "Incoming" || item.status === "Received"),
    [repliesQuery.data],
  )

  const filteredReplies = useMemo(() => {
    const term = search.trim().toLowerCase()

    return replies.filter((item) => {
      const isRead = item.isRead === true
      const matchesRead =
        readFilter === "all" ||
        (readFilter === "read" && isRead) ||
        (readFilter === "unread" && !isRead)
      const matchesChannel =
        channelFilter === "all" ||
        (channelFilter === "Email" && item.kind === "MailInbox") ||
        (channelFilter === "Sms" && item.kind === "Sms")
      const matchesStage = !stageFilter || item.leadStage === stageFilter
      const haystack = [
        item.leadName,
        item.leadEmail,
        item.leadPhone,
        item.title,
        item.summary,
        item.body,
        item.provider,
      ].join(" ").toLowerCase()

      return matchesRead && matchesChannel && matchesStage && (!term || haystack.includes(term))
    })
  }, [channelFilter, readFilter, replies, search, stageFilter])

  const pageCount = Math.max(1, Math.ceil(filteredReplies.length / pageSize))
  const pageReplies = filteredReplies.slice((page - 1) * pageSize, page * pageSize)
  const unreadCount = replies.filter((item) => item.isRead !== true).length
  const visibleUnreadIds = pageReplies.filter((item) => item.isRead !== true).map((item) => item.id)

  function updateRead(ids: number[], isRead = true) {
    if (ids.length === 0) return
    void markRead.mutateAsync({ ids, isRead })
  }

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-4 lg:px-6">
      <Card className="rounded-lg">
        <CardHeader className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <AppIcon name="mark_email_unread" className="size-5" />
              Reply Inbox
            </CardTitle>
            <CardDescription>
              Incoming email and SMS replies. Reply stops pending automation for that lead.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={unreadCount > 0 ? "default" : "outline"}>{`${unreadCount} unread`}</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={visibleUnreadIds.length === 0 || markRead.isPending}
              onClick={() => updateRead(visibleUnreadIds)}
            >
              <AppIcon name="done_all" className="size-4" />
              Mark visible read
            </Button>
            <Button size="sm" render={<Link href="/dashboard/lead-schedule" />}>
              <AppIcon name="campaign" className="size-4" />
              Batch send
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_140px_140px_180px]">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search reply, lead, email, phone"
              className="h-9"
            />
            <Select value={readFilter} onValueChange={(value) => {
              setReadFilter(value as ReadFilter)
              setPage(1)
            }}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Read" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={(value) => {
              setChannelFilter(value as ChannelFilter)
              setPage(1)
            }}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="Sms">SMS</SelectItem>
              </SelectGroup></SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(value) => {
              setStageFilter(value as "" | LeadStage)
              setPage(1)
            }}>
              <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent><SelectGroup>
                <SelectItem value="">All stages</SelectItem>
                {leadStageOrder.map((stage) => (
                  <SelectItem key={stage} value={stage}>{formatLeadStage(stage)}</SelectItem>
                ))}
              </SelectGroup></SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[170px]">Reply</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[220px]">Go To</TableHead>
                  <TableHead className="w-[160px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageReplies.map((item) => (
                  <TableRow key={item.id} className={item.isRead ? "" : "bg-primary/5"}>
                    <TableCell className="align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={item.isRead ? "outline" : "default"}>
                            {item.isRead ? "Read" : "Unread"}
                          </Badge>
                          <Badge variant="outline">{formatChannel(item)}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDateTimeLabel(replyTime(item))}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="font-semibold">{displayText(item.leadName, `Lead #${item.leadId}`)}</p>
                      <p className="text-xs text-muted-foreground">{displayText(item.leadEmail)}</p>
                      <p className="text-xs text-muted-foreground">{displayText(item.leadPhone)}</p>
                      {item.leadStage ? <Badge className="mt-1" variant="outline">{formatLeadStage(item.leadStage)}</Badge> : null}
                    </TableCell>
                    <TableCell className="max-w-[520px] align-top">
                      <p className="font-medium">{displayText(item.title, "Reply received")}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {displayText(item.summary || item.body, "No reply body saved.")}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="xs" variant="outline" render={<Link href={leadHref(item.leadId)} />}>Lead</Button>
                        <Button size="xs" variant="outline" render={<Link href={activityHref(item.leadId)} />}>Activity</Button>
                        <Button size="xs" variant="outline" render={<Link href="/dashboard/showing-feedback/leads" />}>Lead Showing</Button>
                        <Button size="xs" variant="outline" render={<Link href="/dashboard/realtor-showings" />}>Realtor</Button>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="xs" variant="outline" onClick={() => setSelectedReply(item)}>Details</Button>
                        <Button
                          size="xs"
                          variant={item.isRead ? "ghost" : "default"}
                          disabled={markRead.isPending}
                          onClick={() => updateRead([item.id], item.isRead !== true)}
                        >
                          {item.isRead ? "Unread" : "Read"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pageReplies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-sm text-muted-foreground">
                      {repliesQuery.isLoading ? "Loading replies..." : "No replies match current filters."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{`${filteredReplies.length} replies`}</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Prev</Button>
              <span>{`Page ${page} / ${pageCount}`}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Sheet open={selectedReply !== null} onOpenChange={(open) => !open && setSelectedReply(null)}>
        <SheetContent className="sm:w-[34rem]">
          <SheetHeader>
            <SheetTitle>{selectedReply ? `${formatChannel(selectedReply)} reply` : "Reply"}</SheetTitle>
          </SheetHeader>
          {selectedReply ? (
            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
              <div className="rounded-lg border p-3">
                <p className="font-semibold">{displayText(selectedReply.leadName, `Lead #${selectedReply.leadId}`)}</p>
                <p className="text-sm text-muted-foreground">{displayText(selectedReply.leadEmail)}</p>
                <p className="text-sm text-muted-foreground">{displayText(selectedReply.leadPhone)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Reply</p>
                <p className="mt-2 font-semibold">{displayText(selectedReply.title, "Reply received")}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{displayText(selectedReply.body || selectedReply.summary, "No reply body saved.")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Info label="State" value={selectedReply.isRead ? "Read" : "Unread"} />
                <Info label="Channel" value={formatChannel(selectedReply)} />
                <Info label="Stage" value={selectedReply.leadStage ? formatLeadStage(selectedReply.leadStage) : "No stage"} />
                <Info label="Received" value={formatDateTimeLabel(replyTime(selectedReply))} />
              </div>
            </div>
          ) : null}
          {selectedReply ? (
            <SheetFooter>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" render={<Link href={leadHref(selectedReply.leadId)} />}>Open Lead</Button>
                <Button variant="outline" render={<Link href={activityHref(selectedReply.leadId)} />}>Open Activity</Button>
              </div>
              <Button disabled={markRead.isPending} onClick={() => updateRead([selectedReply.id], selectedReply.isRead !== true)}>
                {selectedReply.isRead ? "Mark unread" : "Mark read"}
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
