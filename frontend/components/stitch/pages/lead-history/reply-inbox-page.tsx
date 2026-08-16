"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type {
  LeadOutreachScheduleItem,
  LeadStage,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useLeadOutreachSchedule,
  useMarkLeadRepliesRead,
} from "@/hooks/use-lead-outreach-api"
import {
  formatDateTimeLabel,
  formatLeadStage,
  leadStageOrder,
} from "@/lib/admin-portal"

type ReadFilter = "all" | "unread" | "read"
type ChannelFilter = "all" | "Email" | "Sms"

const pageSize = 18

function displayText(value?: string | null, fallback = "Not set") {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : fallback
}

function formatChannel(item: LeadOutreachScheduleItem) {
  return item.kind === "MailInbox"
    ? "Email"
    : item.kind === "Sms"
      ? "SMS"
      : item.kind
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
  const [selectedReply, setSelectedReply] =
    useState<LeadOutreachScheduleItem | null>(null)

  const repliesQuery = useLeadOutreachSchedule({ status: "Received" })
  const markRead = useMarkLeadRepliesRead()

  const replies = useMemo(
    () =>
      (Array.isArray(repliesQuery.data) ? repliesQuery.data : []).filter(
        (item) => item.direction === "Incoming" || item.status === "Received"
      ),
    [repliesQuery.data]
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
      ]
        .join(" ")
        .toLowerCase()

      return (
        matchesRead &&
        matchesChannel &&
        matchesStage &&
        (!term || haystack.includes(term))
      )
    })
  }, [channelFilter, readFilter, replies, search, stageFilter])

  const pageCount = Math.max(1, Math.ceil(filteredReplies.length / pageSize))
  const pageReplies = filteredReplies.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const unreadCount = replies.filter((item) => item.isRead !== true).length
  const visibleUnreadIds = pageReplies
    .filter((item) => item.isRead !== true)
    .map((item) => item.id)

  function updateRead(ids: number[], isRead = true) {
    if (ids.length === 0) return
    void markRead.mutateAsync({ ids, isRead })
  }

  return (
    <main className="min-h-full bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-md bg-[var(--ether-primary-fixed)] px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[var(--ether-primary)] uppercase">
              Communications
            </span>
            <h1 className="ether-display-lg mt-3 text-[var(--ether-on-surface)]">
              Reply Inbox
            </h1>
            <p className="mt-2 max-w-3xl text-base text-[var(--ether-on-surface-variant)]">
              Incoming email and SMS replies in one place. A reply automatically
              stops pending automation for that lead.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge className="rounded-full border-0 bg-[var(--ether-primary-fixed)] px-4 py-2 text-sm font-bold text-[var(--ether-primary)]">
              {unreadCount} unread
            </Badge>
            <Button
              className="h-11 rounded-lg border-[var(--ether-outline-variant)] bg-white px-4 font-semibold text-[var(--ether-on-surface-variant)] shadow-[var(--shadow-surface-1)]"
              disabled={visibleUnreadIds.length === 0 || markRead.isPending}
              onClick={() => updateRead(visibleUnreadIds)}
              variant="outline"
            >
              <AppIcon name="done_all" />
              Mark visible read
            </Button>
            <Button
              className="h-11 rounded-lg bg-[var(--ether-primary)] px-5 font-semibold text-white shadow-[0_10px_24px_rgba(67,67,213,0.22)] hover:bg-[var(--ether-primary-container)]"
              render={<Link href="/dashboard/lead-schedule" />}
            >
              <AppIcon name="campaign" />
              Batch send
            </Button>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Total Replies"
            value={replies.length}
            icon="forum"
            tone="primary"
          />
          <Metric
            label="Unread"
            value={unreadCount}
            icon="mark_email_unread"
            tone="tertiary"
          />
          <Metric
            label="Email"
            value={replies.filter((item) => item.kind === "MailInbox").length}
            icon="mail"
            tone="primary"
          />
          <Metric
            label="SMS"
            value={replies.filter((item) => item.kind === "Sms").length}
            icon="chat"
            tone="secondary"
          />
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-3 p-5 xl:flex-row xl:items-center">
            <div className="relative flex-1">
              <AppIcon
                className="absolute top-1/2 left-4 -translate-y-1/2 text-[var(--ether-outline)]"
                name="search"
              />
              <Input
                className="h-12 rounded-xl border-[var(--ether-outline-variant)] bg-white pl-11 shadow-none"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search reply, lead, email, or phone"
                value={search}
              />
            </div>
            <Select
              value={readFilter}
              onValueChange={(value) => {
                setReadFilter(value as ReadFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-40">
                <span>
                  {readFilter === "all"
                    ? "All replies"
                    : readFilter === "read"
                      ? "Read"
                      : "Unread"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="all">All replies</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={channelFilter}
              onValueChange={(value) => {
                setChannelFilter(value as ChannelFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-40">
                <span>
                  {channelFilter === "all" ? "All channels" : channelFilter}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All channels</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Sms">SMS</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={stageFilter || "all"}
              onValueChange={(value) => {
                setStageFilter(value === "all" ? "" : (value as LeadStage))
                setPage(1)
              }}
            >
              <SelectTrigger className="h-12 w-full rounded-xl border-[var(--ether-outline-variant)] bg-white px-4 xl:w-44">
                <span>
                  {stageFilter ? formatLeadStage(stageFilter) : "All stages"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All stages</SelectItem>
                  {leadStageOrder.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {formatLeadStage(stage)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table className="min-w-[1180px]">
              <TableHeader>
                <TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_70%,white)]">
                  <TableHead className="ether-label-caps px-6 py-4 text-[var(--ether-on-surface-variant)]">
                    Reply
                  </TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">
                    Lead
                  </TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">
                    Message
                  </TableHead>
                  <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">
                    Navigate
                  </TableHead>
                  <TableHead className="ether-label-caps pr-6 text-right text-[var(--ether-on-surface-variant)]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageReplies.map((item, index) => {
                  const initials = displayText(
                    item.leadName,
                    `Lead #${item.leadId}`
                  )
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                  return (
                    <TableRow
                      className={
                        item.isRead
                          ? "border-0 transition hover:bg-[var(--ether-surface-container-low)]"
                          : "border-0 bg-[color-mix(in_srgb,var(--ether-primary-fixed)_24%,white)] transition hover:bg-[color-mix(in_srgb,var(--ether-primary-fixed)_38%,white)]"
                      }
                      key={item.id}
                    >
                      <TableCell className="px-6 py-5 align-top">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                item.isRead
                                  ? "rounded-full border-0 bg-[var(--ether-surface-container-high)] px-2.5 py-1 text-[10px] font-bold text-[var(--ether-on-surface-variant)] uppercase"
                                  : "rounded-full border-0 bg-[var(--ether-primary)] px-2.5 py-1 text-[10px] font-bold text-white uppercase"
                              }
                            >
                              {item.isRead ? "Read" : "Unread"}
                            </Badge>
                            <Badge className="rounded-full border-0 bg-white px-2.5 py-1 text-[10px] font-bold text-[var(--ether-on-surface-variant)] uppercase shadow-sm">
                              {formatChannel(item)}
                            </Badge>
                          </div>
                          <span className="text-xs text-[var(--ether-outline)]">
                            {formatDateTimeLabel(replyTime(item))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 align-top">
                        <div className="flex items-center gap-3">
                          <span
                            className={
                              index % 2 === 0
                                ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ether-primary-fixed)] text-xs font-bold text-[var(--ether-primary)]"
                                : "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ether-secondary-container)] text-xs font-bold text-[var(--ether-on-secondary-container)]"
                            }
                          >
                            {initials || "LD"}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--ether-on-surface)]">
                              {displayText(
                                item.leadName,
                                `Lead #${item.leadId}`
                              )}
                            </p>
                            <p className="mt-1 max-w-44 truncate text-xs text-[var(--ether-on-surface-variant)]">
                              {displayText(item.leadEmail)}
                            </p>
                            <p className="max-w-44 truncate text-xs text-[var(--ether-on-surface-variant)]">
                              {displayText(item.leadPhone)}
                            </p>
                            {item.leadStage ? (
                              <Badge className="mt-2 rounded-md border-0 bg-[var(--ether-surface-container-high)] px-2 py-1 text-[9px] font-bold text-[var(--ether-on-surface-variant)] uppercase">
                                {formatLeadStage(item.leadStage)}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[520px] py-5 align-top">
                        <p className="font-semibold text-[var(--ether-on-surface)]">
                          {displayText(item.title, "Reply received")}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--ether-on-surface-variant)]">
                          {displayText(
                            item.summary || item.body,
                            "No reply body saved."
                          )}
                        </p>
                      </TableCell>
                      <TableCell className="py-5 align-top">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            render={<Link href={leadHref(item.leadId)} />}
                            variant="outline"
                          >
                            <AppIcon name="person" />
                            Lead
                          </Button>
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            render={<Link href={activityHref(item.leadId)} />}
                            variant="outline"
                          >
                            <AppIcon name="timeline" />
                            Activity
                          </Button>
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            render={
                              <Link href="/dashboard/showing-feedback/leads" />
                            }
                            variant="outline"
                          >
                            <AppIcon name="event" />
                            Showing
                          </Button>
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            render={<Link href="/dashboard/realtor-showings" />}
                            variant="outline"
                          >
                            <AppIcon name="real_estate_agent" />
                            Realtor
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="py-5 pr-6 align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            onClick={() => setSelectedReply(item)}
                            variant="outline"
                          >
                            <AppIcon name="visibility" />
                            Details
                          </Button>
                          <Button
                            className="h-9 rounded-lg px-3 text-xs font-semibold"
                            disabled={markRead.isPending}
                            onClick={() =>
                              updateRead([item.id], item.isRead !== true)
                            }
                            variant={item.isRead ? "ghost" : "default"}
                          >
                            {item.isRead ? (
                              <>
                                <AppIcon name="mark_email_unread" />
                                Unread
                              </>
                            ) : (
                              <>
                                <AppIcon name="done" />
                                Read
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {pageReplies.length === 0 ? (
                  <TableRow className="border-0">
                    <TableCell
                      className="h-32 text-center text-sm text-[var(--ether-outline)]"
                      colSpan={5}
                    >
                      {repliesQuery.isLoading
                        ? "Loading replies..."
                        : "No replies match current filters."}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-[var(--ether-on-surface-variant)]">
              {filteredReplies.length} replies
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                size="sm"
                variant="outline"
              >
                Previous
              </Button>
              <span className="text-sm font-semibold text-[var(--ether-on-surface)]">
                Page {page} of {pageCount}
              </span>
              <Button
                disabled={page >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
                size="sm"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </section>

        <Sheet
          open={selectedReply !== null}
          onOpenChange={(open) => !open && setSelectedReply(null)}
        >
          <SheetContent className="w-full overflow-hidden border-0 bg-[var(--ether-surface)] p-0 shadow-[-20px_0_60px_rgba(11,28,48,0.16)] sm:max-w-[38rem]">
            <SheetHeader className="bg-white px-6 py-6 text-left">
              <SheetTitle className="text-2xl font-bold tracking-[-0.02em]">
                {selectedReply
                  ? `${formatChannel(selectedReply)} Reply`
                  : "Reply"}
              </SheetTitle>
            </SheetHeader>
            {selectedReply ? (
              <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-6">
                <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
                  <p className="font-bold text-[var(--ether-on-surface)]">
                    {displayText(
                      selectedReply.leadName,
                      `Lead #${selectedReply.leadId}`
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">
                    {displayText(selectedReply.leadEmail)}
                  </p>
                  <p className="text-sm text-[var(--ether-on-surface-variant)]">
                    {displayText(selectedReply.leadPhone)}
                  </p>
                </section>
                <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
                  <p className="ether-label-caps text-[var(--ether-outline)]">
                    Reply
                  </p>
                  <p className="mt-3 font-bold text-[var(--ether-on-surface)]">
                    {displayText(selectedReply.title, "Reply received")}
                  </p>
                  <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-[var(--ether-on-surface-variant)]">
                    {displayText(
                      selectedReply.body || selectedReply.summary,
                      "No reply body saved."
                    )}
                  </p>
                </section>
                <div className="grid grid-cols-2 gap-3">
                  <Info
                    label="State"
                    value={selectedReply.isRead ? "Read" : "Unread"}
                  />
                  <Info label="Channel" value={formatChannel(selectedReply)} />
                  <Info
                    label="Stage"
                    value={
                      selectedReply.leadStage
                        ? formatLeadStage(selectedReply.leadStage)
                        : "No stage"
                    }
                  />
                  <Info
                    label="Received"
                    value={formatDateTimeLabel(replyTime(selectedReply))}
                  />
                </div>
              </div>
            ) : null}
            {selectedReply ? (
              <SheetFooter className="bg-white px-6 py-4 shadow-[0_-10px_30px_rgba(11,28,48,0.06)]">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    render={<Link href={leadHref(selectedReply.leadId)} />}
                    variant="outline"
                  >
                    Open Lead
                  </Button>
                  <Button
                    render={<Link href={activityHref(selectedReply.leadId)} />}
                    variant="outline"
                  >
                    Open Activity
                  </Button>
                </div>
                <Button
                  className="bg-[var(--ether-primary)] text-white"
                  disabled={markRead.isPending}
                  onClick={() =>
                    updateRead(
                      [selectedReply.id],
                      selectedReply.isRead !== true
                    )
                  }
                >
                  {selectedReply.isRead ? "Mark unread" : "Mark read"}
                </Button>
              </SheetFooter>
            ) : null}
          </SheetContent>
        </Sheet>
      </div>
    </main>
  )
}

function Metric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: string
  tone: "primary" | "secondary" | "tertiary"
}) {
  const toneClass =
    tone === "secondary"
      ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]"
      : tone === "tertiary"
        ? "bg-[var(--ether-error-container)] text-[var(--ether-error)]"
        : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"
  return (
    <article className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="ether-label-caps text-[var(--ether-on-surface-variant)]">
            {label}
          </p>
          <p className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">
            {value}
          </p>
        </div>
        <span
          className={`flex size-12 items-center justify-center rounded-2xl ${toneClass}`}
        >
          <AppIcon name={icon} />
        </span>
      </div>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-[var(--shadow-surface-1)]">
      <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--ether-on-surface)]">
        {value}
      </p>
    </div>
  )
}
