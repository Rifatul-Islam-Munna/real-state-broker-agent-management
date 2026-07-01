"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { usePropertyChats } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE = 10

export function PropertyChatInboxPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "New" | "LeadCreated" | "NeedsReview">("")

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
        value: `${propertyChats.length}`,
      },
      {
        label: "New",
        value: `${propertyChats.filter((item) => item.status === "New").length}`,
      },
      {
        label: "Needs Review",
        value: `${propertyChats.filter((item) => item.status === "NeedsReview").length}`,
      },
      {
        label: "Lead Created",
        value: `${propertyChats.filter((item) => item.status === "LeadCreated").length}`,
      },
    ],
    [propertyChats],
  )

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <main className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{"Property Chat Inbox"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {"Listing-specific chats from public property pages land here. Use this page to review buyer questions, see pre-question answers, and open the lead created from each qualified property chat."}
          </p>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <Input
              className="h-auto border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Search chats, contacts, or messages"
              value={searchTerm}
            />
            <Select
              modal={false}
              onValueChange={(value) => {
                setStatusFilter(
                  !value || value === "all" ? "" : (value as "New" | "LeadCreated" | "NeedsReview"),
                )
                setPage(1)
              }}
              value={statusFilter || "all"}
            >
              <SelectTrigger className="h-auto min-w-44 border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {"All Statuses"}
                </SelectItem>
                <SelectItem value="New">
                  {"New"}
                </SelectItem>
                <SelectItem value="NeedsReview">
                  {"Needs Review"}
                </SelectItem>
                <SelectItem value="LeadCreated">
                  {"Lead Created"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-2 xl:grid-cols-4 md:px-6">
          {stats.map((stat) => (
            <article key={stat.label} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">{stat.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{stat.value}</p>
            </article>
          ))}
        </section>

        <section className="space-y-4 px-4 py-6 md:px-6">
          {isInitialLoading ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading property chats..."}</p>
            </article>
          ) : propertyChatsQuery.error ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-rose-600">{propertyChatsQuery.error.message}</p>
            </article>
          ) : propertyChats.length === 0 ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No property chats match the current filters."}</p>
            </article>
          ) : (
            <div className="space-y-4">
              {propertyChats.map((chat) => (
                <article key={chat.id} className="border border-primary/10 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">{chat.contactName || "Anonymous visitor"}</h2>
                        <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{chat.propertyTitle}</span>
                        <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{chat.status}</span>
                        {chat.autoQualified ? (
                          <span className="border border-green-200 bg-green-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">{"Lead Created"}</span>
                        ) : null}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{chat.summary}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Routing"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{chat.assignedAgent || "Unassigned"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{chat.contactEmail || chat.contactPhone || "No contact detail"}</p>
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(chat.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {chat.leadId ? (
                        <Link className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href={`/dashboard/leads?leadId=${chat.leadId}`}>
                          {"Open Lead CRM"}
                        </Link>
                      ) : (
                        <span className="border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-amber-700">
                          {"Needs Review"}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 md:px-6">
          <PagePagination currentPage={page} onPageChange={setPage} totalPages={propertyChatsQuery.data?.totalPages ?? 1} />
        </div>
      </main>
    </div>
  )
}
