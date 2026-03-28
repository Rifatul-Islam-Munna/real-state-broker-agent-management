"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import {
  useContactRequests,
  useConvertContactRequestToLead,
  usePropertyChats,
} from "@/hooks/use-real-estate-api"
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
  const [statusFilter, setStatusFilter] = useState<"" | "New" | "Reviewing" | "Converted">("")

  const contactRequestsQuery = useContactRequests({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  })
  const propertyChatsQuery = usePropertyChats({
    page: 1,
    pageSize: 6,
    search: searchTerm || undefined,
  })
  const convertContactRequestToLead = useConvertContactRequestToLead()
  const isInitialLoading =
    !contactRequestsQuery.data && (contactRequestsQuery.isLoading || contactRequestsQuery.isFetching)

  const contactRequests = useMemo(
    () => contactRequestsQuery.data?.items ?? [],
    [contactRequestsQuery.data?.items],
  )
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
        label: "New Contacts",
        value: `${contactRequests.filter((item) => item.status === "New").length}`,
      },
      {
        label: "Reviewing",
        value: `${contactRequests.filter((item) => item.status === "Reviewing").length}`,
      },
      {
        label: "Converted",
        value: `${contactRequests.filter((item) => item.status === "Converted").length}`,
      },
    ],
    [contactRequests, propertyChats.length],
  )

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <main className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{"Contact Us Inbox"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {"Public contact requests land here, and listing-specific property chats now flow into the same workspace with summaries and automatic lead qualification."}
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
                  !value || value === "all" ? "" : (value as "New" | "Reviewing" | "Converted"),
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
                <SelectItem value="Reviewing">
                  {"Reviewing"}
                </SelectItem>
                <SelectItem value="Converted">
                  {"Converted"}
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
          {propertyChats.length > 0 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{"Property Chat Intake"}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {"Listing chats run through the property pre-questions first, then save a text summary and optionally create a lead automatically for the assigned agent."}
                </p>
              </div>
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
                        <Link className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href="/admin/lead-crm-pipeline">
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
          ) : null}

          {isInitialLoading ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading contact requests..."}</p>
            </article>
          ) : contactRequestsQuery.error ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-rose-600">{contactRequestsQuery.error.message}</p>
            </article>
          ) : contactRequests.length === 0 ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No contact requests match the current filters."}</p>
            </article>
          ) : (
            contactRequests.map((item) => (
              <article key={item.id} className="border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900">
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.name}</h2>
                      <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{item.inquiryType}</span>
                      <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{item.status}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.message}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Contact"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.email}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.phone}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(item.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {item.leadId ? (
                      <Link className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white" href="/admin/lead-crm-pipeline">
                        {"Open Lead CRM"}
                      </Link>
                    ) : (
                      <button
                        className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={convertContactRequestToLead.isPending}
                        onClick={() => void convertContactRequestToLead.mutateAsync({ contactRequestId: item.id })}
                        type="button"
                      >
                        {"Convert To Lead"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 md:px-6">
          <PagePagination currentPage={page} onPageChange={setPage} totalPages={contactRequestsQuery.data?.totalPages ?? 1} />
        </div>
      </main>
    </div>
  )
}
