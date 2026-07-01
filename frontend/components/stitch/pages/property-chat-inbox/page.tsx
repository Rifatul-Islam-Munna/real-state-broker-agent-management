"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { usePropertyChats } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-6">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle>{"Property Chat Inbox"}</CardTitle>
          <CardDescription className="max-w-3xl">
            {"Listing-specific chats from public property pages land here. Use this page to review buyer questions, see pre-question answers, and open the lead created from each qualified property chat."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              className="md:flex-1"
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
              <SelectTrigger className="w-full md:w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{"All Statuses"}</SelectItem>
                  <SelectItem value="New">{"New"}</SelectItem>
                  <SelectItem value="NeedsReview">{"Needs Review"}</SelectItem>
                  <SelectItem value="LeadCreated">{"Lead Created"}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-1">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle>{stat.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{"Chats"}</CardTitle>
          <CardDescription>{"Review conversations, routing, and converted leads."}</CardDescription>
        </CardHeader>
        <CardContent>
          {isInitialLoading ? (
            <Empty><EmptyHeader><EmptyTitle>{"Loading property chats..."}</EmptyTitle></EmptyHeader></Empty>
          ) : propertyChatsQuery.error ? (
            <Empty><EmptyHeader><EmptyTitle>{propertyChatsQuery.error.message}</EmptyTitle></EmptyHeader></Empty>
          ) : propertyChats.length === 0 ? (
            <Empty><EmptyHeader><EmptyTitle>{"No property chats"}</EmptyTitle><EmptyDescription>{"No chats match the current filters."}</EmptyDescription></EmptyHeader></Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{"Visitor"}</TableHead>
                  <TableHead>{"Property"}</TableHead>
                  <TableHead>{"Summary"}</TableHead>
                  <TableHead>{"Routing"}</TableHead>
                  <TableHead>{"Status"}</TableHead>
                  <TableHead className="text-right">{"Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propertyChats.map((chat) => (
                  <TableRow key={chat.id}>
                    <TableCell>
                      <p className="font-medium">{chat.contactName || "Anonymous visitor"}</p>
                      <p className="text-muted-foreground">{chat.contactEmail || chat.contactPhone || "No contact detail"}</p>
                    </TableCell>
                    <TableCell>{chat.propertyTitle}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="max-h-10 overflow-hidden text-muted-foreground">{chat.summary}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{chat.assignedAgent || "Unassigned"}</p>
                      <p className="text-muted-foreground">{formatDateTimeLabel(chat.createdAt)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={chat.status === "NeedsReview" ? "outline" : "secondary"}>{chat.status}</Badge>
                        {chat.autoQualified ? <Badge>{"Lead Created"}</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {chat.leadId ? (
                        <Button render={<Link href={`/dashboard/leads?leadId=${chat.leadId}`} />} size="sm">
                          {"Open Lead"}
                        </Button>
                      ) : (
                        <Badge variant="outline">{"Needs Review"}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardContent>
          <PagePagination currentPage={page} onPageChange={setPage} totalPages={propertyChatsQuery.data?.totalPages ?? 1} />
        </CardContent>
      </Card>
    </main>
  )
}
