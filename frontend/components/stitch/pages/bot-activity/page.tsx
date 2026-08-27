"use client"

import { useMemo, useState, type ChangeEvent } from "react"
import { BotIcon, CalendarClockIcon, MessageSquareIcon, SearchIcon } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { filterBotActivity, type BotActivityItem } from "@/lib/chatbot-operations"

type Props = { initialActivity: BotActivityItem[] }

export function BotActivityPage({ initialActivity }: Props) {
  const [search, setSearch] = useState("")
  const [kind, setKind] = useState("all")
  const [channel, setChannel] = useState("all")
  const [status, setStatus] = useState("all")
  const filtered = useMemo(
    () => filterBotActivity(initialActivity, { search, kind, channel, status }),
    [channel, initialActivity, kind, search, status]
  )
  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.currentTarget.value)

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BotIcon /></span>
          <div><p className="text-sm font-medium text-primary">AI Chatbot</p><h1 className="text-2xl font-semibold tracking-tight">Bot Activity</h1></div>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">Messages, policy decisions, and lifecycle events retained for seven days.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Activity feed</CardTitle>
          <CardDescription>{filtered.length} of {initialActivity.length} records</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(16rem,1fr)_10rem_10rem_10rem]">
            <InputGroup>
              <InputGroupAddon><SearchIcon /></InputGroupAddon>
              <InputGroupInput aria-label="Search bot activity" placeholder="Search lead, property, message…" value={search} onChange={handleSearch} />
            </InputGroup>
            <ActivitySelect label="Kind" value={kind} onChange={setKind} items={[["all", "All types"], ["message", "Messages"], ["event", "Events"]]} />
            <ActivitySelect label="Channel" value={channel} onChange={setChannel} items={[["all", "All channels"], ["WEB", "Web"], ["EMAIL", "Email"], ["SMS", "SMS"]]} />
            <ActivitySelect label="Status" value={status} onChange={setStatus} items={[["all", "All statuses"], ["ACTIVE", "Active"], ["STOPPED", "Stopped"], ["COMPLETED", "Completed"], ["HANDOFF", "Handoff"]]} />
          </div>

          {filtered.length === 0 ? (
            <Empty className="border">
              <EmptyHeader><EmptyMedia variant="icon"><CalendarClockIcon /></EmptyMedia><EmptyTitle>No matching activity</EmptyTitle><EmptyDescription>Change filters or search text.</EmptyDescription></EmptyHeader>
            </Empty>
          ) : (
            <Accordion className="rounded-xl border px-3">
              {filtered.map((item) => (
                <AccordionItem key={`${item.kind}-${item.id}`} value={`${item.kind}-${item.id}`}>
                  <AccordionTrigger className="no-underline hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><MessageSquareIcon /></span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="flex flex-wrap items-center gap-2"><span className="font-medium">{item.leadName}</span><Badge variant="outline">{item.channel}</Badge><Badge variant={item.kind === "event" ? "secondary" : "outline"}>{item.type}</Badge></span>
                        <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{item.propertyTitle ?? "No property"} · {item.reason ?? "No decision"}</span>
                      </span>
                      <time className="hidden shrink-0 text-xs font-normal text-muted-foreground sm:block" dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-11">
                    <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6">{item.body || "No message body for this event."}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span>Status: {item.conversationStatus}</span><span>Direction: {item.direction ?? "—"}</span><span>Confidence: {item.confidence == null ? "—" : `${Math.round(item.confidence * 100)}%`}</span></div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function ActivitySelect({ label, value, onChange, items }: { label: string; value: string; onChange: (value: string) => void; items: string[][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{items.map(([itemValue, itemLabel]) => <SelectItem key={itemValue} value={itemValue}>{itemLabel}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  )
}
