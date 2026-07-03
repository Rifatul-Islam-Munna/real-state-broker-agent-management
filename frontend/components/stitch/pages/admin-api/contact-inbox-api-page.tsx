"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useContactRequests, useConvertContactRequestToLead } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

const PAGE_SIZE = 10

export function ContactInboxApiPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "New" | "Reviewing" | "Converted">("")

  const contactRequestsQuery = useContactRequests({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  })
  const convertContactRequestToLead = useConvertContactRequestToLead()
  const isInitialLoading =
    !contactRequestsQuery.data && (contactRequestsQuery.isLoading || contactRequestsQuery.isFetching)

  const contactRequests = useMemo(
    () => contactRequestsQuery.data?.items ?? [],
    [contactRequestsQuery.data?.items],
  )

  const stats = useMemo(
    () => [
      {
        label: "New contacts",
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
    [contactRequests],
  )

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{"Contact inbox"}</CardTitle>
            <CardDescription className="max-w-2xl">
              {"Review public contact submissions and move qualified inquiries into the lead pipeline."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                className="md:max-w-xl"
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder="Search contacts or messages"
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
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{"All statuses"}</SelectItem>
                  <SelectItem value="New">{"New"}</SelectItem>
                  <SelectItem value="Reviewing">{"Reviewing"}</SelectItem>
                  <SelectItem value="Converted">{"Converted"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-3xl">{stat.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          {isInitialLoading ? (
            <Alert>
              <AlertDescription>{"Loading contact requests..."}</AlertDescription>
            </Alert>
          ) : contactRequestsQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>{contactRequestsQuery.error.message}</AlertDescription>
            </Alert>
          ) : contactRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
              {"No contact requests match the current filters."}
            </div>
          ) : (
            contactRequests.map((item) => (
              <Card key={item.id}>
                <CardContent className="grid gap-5 pt-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold">{item.name}</h2>
                      <Badge variant="secondary">{item.inquiryType}</Badge>
                      <Badge variant={item.status === "Converted" ? "default" : "outline"}>
                        {item.status}
                      </Badge>
                    </div>
                    {item.propertyTitle || item.agentName ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.propertyTitle ? (
                          <Badge variant="outline">{`Property: ${item.propertyTitle}`}</Badge>
                        ) : null}
                        {item.agentName ? (
                          <Badge variant="outline">{`Agent: ${item.agentName}`}</Badge>
                        ) : null}
                      </div>
                    ) : null}
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  </div>

                  <div className="rounded-xl bg-muted/45 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {"Contact"}
                    </p>
                    <p className="mt-2 break-all text-sm font-semibold">{item.email}</p>
                    <p className="text-sm text-muted-foreground">{item.phone}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTimeLabel(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {item.leadId ? (
                      <Button render={<Link href="/dashboard/leads" />} size="sm">
                        {"Open lead CRM"}
                      </Button>
                    ) : (
                      <Button
                        disabled={convertContactRequestToLead.isPending}
                        onClick={() => void convertContactRequestToLead.mutateAsync({ contactRequestId: item.id })}
                        size="sm"
                        type="button"
                      >
                        {convertContactRequestToLead.isPending ? "Converting..." : "Convert to lead"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <PagePagination
            currentPage={page}
            onPageChange={setPage}
            totalPages={contactRequestsQuery.data?.totalPages ?? 1}
          />
        </div>
      </div>
    </main>
  )
}
