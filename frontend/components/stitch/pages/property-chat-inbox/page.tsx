"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePropertyChats } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

type StatusFilter = "" | "New" | "LeadCreated" | "NeedsReview"

function getInitials(name?: string | null) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AV"
  )
}

function statusLabel(status: string) {
  return `${status ?? ""}`.replace(/([A-Z])/g, " $1").trim()
}

export function PropertyChatInboxPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("")

  const propertyChatsQuery = usePropertyChats({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  })
  const isInitialLoading =
    !propertyChatsQuery.data && (propertyChatsQuery.isLoading || propertyChatsQuery.isFetching)

  const propertyChats = useMemo(
    () => propertyChatsQuery.data?.items ?? [],
    [propertyChatsQuery.data?.items],
  )

  const stats = useMemo(
    () => [
      {
        label: "Property Chats",
        value: propertyChats.length,
        icon: "forum",
        iconClass: "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]",
      },
      {
        label: "New",
        value: propertyChats.filter((item) => item.status === "New").length,
        icon: "mark_chat_unread",
        iconClass: "bg-[var(--ether-error-container)] text-[var(--ether-tertiary)]",
      },
      {
        label: "Needs Review",
        value: propertyChats.filter((item) => item.status === "NeedsReview").length,
        icon: "pending_actions",
        iconClass:
          "bg-[color-mix(in_srgb,var(--ether-secondary-container)_30%,white)] text-[var(--ether-secondary)]",
      },
      {
        label: "Lead Created",
        value: propertyChats.filter((item) => item.status === "LeadCreated").length,
        icon: "person_add",
        iconClass:
          "bg-[color-mix(in_srgb,var(--ether-secondary-container)_45%,white)] text-[var(--ether-secondary)]",
      },
    ],
    [propertyChats],
  )

  return (
    <main className="min-w-0 flex-1 bg-[var(--ether-surface)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-7">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="ether-display-lg text-[var(--ether-on-surface)]">Property Chat Inbox</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--ether-on-surface-variant)]">
              Listing-specific chats from public property pages land here. Review buyer questions, see pre-question answers, and manage leads.
            </p>
          </div>

          <Select
            modal={false}
            onValueChange={(value) => {
              setStatusFilter(!value || value === "all" ? "" : (value as Exclude<StatusFilter, "">))
              setPage(1)
            }}
            value={statusFilter || "all"}
          >
            <SelectTrigger className="h-11 w-full rounded-xl border-0 bg-white px-4 font-semibold shadow-[var(--shadow-surface-1)] sm:w-44">
              <AppIcon className="mr-2 text-[var(--ether-on-surface-variant)]" name="filter_list" />
              <SelectValue placeholder="All Chats" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All Chats</SelectItem>
                <SelectItem value="New">New</SelectItem>
                <SelectItem value="NeedsReview">Needs Review</SelectItem>
                <SelectItem value="LeadCreated">Lead Created</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </section>

        <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <article
              className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-surface-1)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-surface-2)]"
              key={stat.label}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="ether-label-caps text-[var(--ether-on-surface-variant)]">{stat.label}</p>
                  <p className="ether-numeric-lg mt-3 text-[var(--ether-on-surface)]">{stat.value}</p>
                </div>
                <span className={cn("flex size-12 items-center justify-center rounded-2xl", stat.iconClass)}>
                  <AppIcon className="text-2xl" name={stat.icon} />
                </span>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-surface-1)]">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="ether-headline-sm text-[var(--ether-on-surface)]">Recent Inquiries</h2>
            <div className="relative w-full sm:max-w-xs">
              <AppIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
              <Input
                className="h-10 rounded-full border-0 bg-[var(--ether-surface-container-low)] pl-10 pr-4 shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder="Search chats or contacts"
                value={searchTerm}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isInitialLoading ? (
              <div className="p-8">
                <Empty><EmptyHeader><EmptyTitle>Loading property chats...</EmptyTitle></EmptyHeader></Empty>
              </div>
            ) : propertyChatsQuery.error ? (
              <div className="p-8">
                <Empty><EmptyHeader><EmptyTitle>{propertyChatsQuery.error.message}</EmptyTitle></EmptyHeader></Empty>
              </div>
            ) : propertyChats.length === 0 ? (
              <div className="p-8">
                <Empty><EmptyHeader><EmptyTitle>No property chats</EmptyTitle><EmptyDescription>No chats match the current filters.</EmptyDescription></EmptyHeader></Empty>
              </div>
            ) : (
              <Table className="min-w-[1080px]">
                <TableHeader>
                  <TableRow className="border-0 bg-[color-mix(in_srgb,var(--ether-surface-container-low)_68%,white)] hover:bg-[color-mix(in_srgb,var(--ether-surface-container-low)_68%,white)]">
                    <TableHead className="px-6 py-4 ether-label-caps text-[var(--ether-on-surface-variant)]">Visitor</TableHead>
                    <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Property</TableHead>
                    <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Summary</TableHead>
                    <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Routing</TableHead>
                    <TableHead className="ether-label-caps text-[var(--ether-on-surface-variant)]">Status</TableHead>
                    <TableHead className="pr-6 text-right ether-label-caps text-[var(--ether-on-surface-variant)]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyChats.map((chat, index) => {
                    const status = statusLabel(chat.status)
                    const avatarClass = [
                      "bg-[var(--ether-primary-container)] text-white",
                      "bg-[var(--ether-secondary-container)] text-[var(--ether-on-secondary-container)]",
                      "bg-[var(--ether-tertiary-fixed)] text-[var(--ether-on-tertiary-fixed)]",
                    ][index % 3]

                    return (
                      <TableRow className="border-0 transition hover:bg-[var(--ether-surface-container-low)]" key={chat.id}>
                        <TableCell className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", avatarClass)}>
                              {getInitials(chat.contactName)}
                            </span>
                            <div className="min-w-0">
                              <p className="max-w-44 truncate text-sm font-bold text-[var(--ether-on-surface)]">{chat.contactName || "Anonymous visitor"}</p>
                              <p className="mt-1 max-w-44 truncate text-xs text-[var(--ether-on-surface-variant)]">{chat.contactEmail || chat.contactPhone || "No contact detail"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <p className="max-w-40 text-sm font-semibold text-[var(--ether-on-surface)]">{chat.propertyTitle}</p>
                        </TableCell>
                        <TableCell className="max-w-sm py-5">
                          <p className="truncate text-sm text-[var(--ether-on-surface-variant)]">{chat.summary}</p>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex items-start gap-2">
                            <AppIcon className={cn("mt-0.5 text-lg", chat.assignedAgent ? "text-[var(--ether-primary)]" : "text-[var(--ether-outline)]")} name={chat.assignedAgent ? "person" : "person_search"} />
                            <div>
                              <p className={cn("text-sm font-medium", chat.assignedAgent ? "text-[var(--ether-on-surface)]" : "italic text-[var(--ether-on-surface-variant)]")}>{chat.assignedAgent || "Unassigned"}</p>
                              <p className="mt-1 text-[10px] text-[var(--ether-outline)]">{formatDateTimeLabel(chat.createdAt)}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-5">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              className={cn(
                                "rounded-full border-0 px-3 py-1 text-[10px] font-bold uppercase",
                                chat.status === "NeedsReview"
                                  ? "bg-[var(--ether-error-container)] text-[var(--ether-tertiary)]"
                                  : chat.status === "LeadCreated"
                                    ? "bg-[color-mix(in_srgb,var(--ether-secondary-container)_35%,white)] text-[var(--ether-secondary)]"
                                    : "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]",
                              )}
                            >
                              {status}
                            </Badge>
                            {chat.autoQualified && chat.status !== "LeadCreated" ? (
                              <Badge className="rounded-full border-0 bg-[var(--ether-primary-fixed)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--ether-primary)]">Lead Created</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-5 pr-6 text-right">
                          {chat.leadId ? (
                            <Button
                              className="rounded-lg bg-[var(--ether-primary)] px-4 font-semibold text-white hover:bg-[var(--ether-primary-container)]"
                              render={<Link href={`/dashboard/leads?leadId=${chat.leadId}`} />}
                              size="sm"
                            >
                              Open Lead
                            </Button>
                          ) : (
                            <Badge className="rounded-full border-0 bg-[var(--ether-error-container)] px-3 py-1 text-[10px] font-bold uppercase text-[var(--ether-tertiary)]">Needs Review</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[var(--ether-on-surface-variant)]">
              Showing page {page} of {propertyChatsQuery.data?.totalPages ?? 1}
            </p>
            <PagePagination currentPage={page} onPageChange={setPage} totalPages={propertyChatsQuery.data?.totalPages ?? 1} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <article className="flex flex-col gap-5 rounded-[24px] bg-[color-mix(in_srgb,var(--ether-primary-fixed)_48%,white)] p-6 sm:flex-row sm:items-center">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-[var(--ether-primary)] shadow-[var(--shadow-surface-1)]">
              <AppIcon className="text-3xl" name="lightbulb" />
            </span>
            <div>
              <h3 className="ether-headline-sm text-[var(--ether-primary)]">Pro Tip: Lead Scoring</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ether-on-surface-variant)]">
                Chats that contain words like “budget,” “financing,” or “closing” are automatically prioritized in your Needs Review queue for faster follow-up.
              </p>
            </div>
          </article>

          <article className="relative overflow-hidden rounded-[24px] bg-[color-mix(in_srgb,var(--ether-secondary-container)_20%,white)] p-6">
            <div className="relative z-10">
              <h3 className="ether-headline-sm text-[var(--ether-secondary)]">Analytics View</h3>
              <p className="mt-2 text-sm text-[var(--ether-on-surface-variant)]">Monitor chat volume and lead conversion trends.</p>
              <Link className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[var(--ether-secondary)]" href="/dashboard/reports">
                View Trends <AppIcon className="text-sm" name="arrow_forward" />
              </Link>
            </div>
            <AppIcon className="absolute -bottom-5 -right-5 rotate-12 text-8xl text-[var(--ether-secondary)] opacity-10" name="trending_up" />
          </article>
        </section>
      </div>
    </main>
  )
}
