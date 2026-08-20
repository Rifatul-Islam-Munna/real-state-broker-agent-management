/* eslint-disable @next/next/no-img-element */
"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import type { SmsMessageItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useSendSmsMessage,
  useSmsMessageItem,
  useSmsMessages,
  useSyncSmsMessages,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { uploadPropertyAsset } from "@/lib/upload-client"

const PAGE_SIZE = 200

type Conversation = {
  key: string
  number: string
  leadId?: number | null
  leadName: string
  provider: string
  latest: SmsMessageItem
  messages: SmsMessageItem[]
}

type LocalReply = {
  id: string
  body: string
  createdAt: string
  mediaUrls: string[]
}

export function ProfessionalTextMessagesPage() {
  return <ProfessionalTextWorkspace />
}

export function ProfessionalTextMessageDetailPage({ messageId }: { messageId: number }) {
  return <ProfessionalTextWorkspace initialMessageId={messageId} />
}

function ProfessionalTextWorkspace({ initialMessageId }: { initialMessageId?: number }) {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [search, setSearch] = useState("")
  const [direction, setDirection] = useState<"all" | "Incoming" | "Outgoing">("all")
  const [selectedId, setSelectedId] = useState<number | null>(initialMessageId ?? null)
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [showAttachments, setShowAttachments] = useState(false)
  const [localReplies, setLocalReplies] = useState<LocalReply[]>([])
  const [newOpen, setNewOpen] = useState(false)
  const [newTo, setNewTo] = useState("")
  const [newBody, setNewBody] = useState("")
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [showLeadDetails, setShowLeadDetails] = useState(true)

  const messagesQuery = useSmsMessages({
    page: 1,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    direction: direction === "all" ? undefined : direction,
  })
  const selectedQuery = useSmsMessageItem(selectedId ?? undefined)
  const sendMutation = useSendSmsMessage()
  const syncMutation = useSyncSmsMessages()

  const messages = useMemo(() => messagesQuery.data?.items ?? [], [messagesQuery.data?.items])
  const selectedMessage = selectedQuery.data ?? messages.find((item) => item.id === selectedId) ?? null
  const conversations = useMemo(() => groupConversations(messages), [messages])
  const selectedConversation = useMemo(() => {
    if (!selectedMessage) return null
    const key = conversationKey(selectedMessage)
    return conversations.find((item) => item.key === key) ?? {
      key,
      number: counterparty(selectedMessage),
      leadId: selectedMessage.leadId,
      leadName: selectedMessage.leadName,
      provider: selectedMessage.provider,
      latest: selectedMessage,
      messages: [selectedMessage],
    }
  }, [conversations, selectedMessage])

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].latest.id)
  }, [conversations, selectedId])

  useEffect(() => {
    setBody("")
    setFiles([])
    setShowAttachments(false)
    setLocalReplies([])
  }, [selectedId])

  function selectConversation(item: Conversation) {
    setSelectedId(item.latest.id)
    router.replace(`/dashboard/text-messages/${item.latest.id}`, { scroll: false })
  }

  async function sendReply() {
    if (!selectedConversation) return
    const uploads = await Promise.all(files.map((file) => uploadPropertyAsset(file, "mms-attachments")))
    const response = await sendMutation.mutateAsync({
      leadId: selectedConversation.leadId ?? undefined,
      to: selectedConversation.number,
      body: body.trim(),
      mediaUrls: uploads.map((item) => item.url),
    })
    if (response.error) return
    setLocalReplies((current) => [...current, {
      id: `local-${Date.now()}`,
      body: body.trim() || "Attachment sent.",
      createdAt: new Date().toISOString(),
      mediaUrls: uploads.map((item) => item.url),
    }])
    setBody("")
    setFiles([])
    setShowAttachments(false)
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  async function sendNew() {
    const uploads = await Promise.all(newFiles.map((file) => uploadPropertyAsset(file, "mms-attachments")))
    const response = await sendMutation.mutateAsync({
      to: newTo.trim(),
      body: newBody.trim(),
      mediaUrls: uploads.map((item) => item.url),
    })
    if (response.error) return
    setNewOpen(false)
    setNewTo("")
    setNewBody("")
    setNewFiles([])
  }

  const error = messagesQuery.error ?? selectedQuery.error ?? sendMutation.error

  return (
    <main className="h-[calc(100dvh-4rem)] min-h-[720px] overflow-hidden bg-[var(--ether-surface)] p-0">
      <div
        className={`mx-auto grid h-full max-w-[1680px] overflow-hidden bg-white shadow-[var(--shadow-surface-1)] ${
          showLeadDetails
            ? "lg:grid-cols-[360px_minmax(0,1fr)_320px]"
            : "lg:grid-cols-[360px_minmax(0,1fr)]"
        }`}
      >
        <section className="flex min-h-0 flex-col border-r border-[color-mix(in_srgb,var(--ether-outline-variant)_38%,transparent)] bg-white">
          <header className="space-y-4 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_32%,transparent)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Unified Messaging</p>
                <h1 className="mt-1 text-xl font-bold text-[var(--ether-on-surface)]">Communications</h1>
              </div>
              <div className="flex gap-2">
                <Button
                  aria-label="Sync messages now"
                  className="rounded-lg border-[var(--ether-outline-variant)] bg-white"
                  disabled={syncMutation.isPending}
                  onClick={() => void syncMutation.mutateAsync({})}
                  size="icon-sm"
                  title="Sync messages"
                  variant="outline"
                >
                  <AppIcon name="sync" />
                </Button>
                <Button
                  className="rounded-lg bg-[var(--ether-primary)] text-white"
                  onClick={() => setNewOpen(true)}
                  size="icon-sm"
                  title="New message"
                >
                  <AppIcon name="edit" />
                </Button>
              </div>
            </div>

            <div className="relative">
              <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="search" />
              <Input
                className="h-11 rounded-xl border-0 bg-[var(--ether-surface-container-low)] pl-9 shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                value={search}
              />
            </div>

            <div className="grid grid-cols-3 rounded-xl bg-[var(--ether-surface-container)] p-1">
              {(["all", "Incoming", "Outgoing"] as const).map((item) => (
                <button
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    direction === item
                      ? "bg-white text-[var(--ether-primary)] shadow-sm"
                      : "text-[var(--ether-on-surface-variant)] hover:text-[var(--ether-on-surface)]"
                  }`}
                  key={item}
                  onClick={() => setDirection(item)}
                  type="button"
                >
                  {item === "all" ? "All" : item === "Incoming" ? "Inbox" : "Sent"}
                </button>
              ))}
            </div>
          </header>

          {error ? <Alert className="m-3" variant="destructive"><AlertDescription>{error.message}</AlertDescription></Alert> : null}

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            {messagesQuery.isLoading && !conversations.length ? (
              <EmptyState text="Loading conversations..." />
            ) : !conversations.length ? (
              <EmptyState text="No text conversations found." />
            ) : conversations.map((item) => (
              <ConversationRow active={item.key === selectedConversation?.key} item={item} key={item.key} onClick={() => selectConversation(item)} />
            ))}
          </div>

          <footer className="border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_30%,transparent)] px-4 py-3 text-xs text-[var(--ether-outline)]">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </footer>
        </section>

        <section className="hidden min-h-0 flex-col bg-[var(--ether-surface)] md:flex">
          {selectedConversation ? (
            <>
              <header className="border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_32%,transparent)] bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar value={selectedConversation.leadName || selectedConversation.number} />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-[var(--ether-on-surface)]">{selectedConversation.leadName || selectedConversation.number}</h2>
                      <p className="truncate text-sm text-[var(--ether-on-surface-variant)]">{selectedConversation.number} ? {selectedConversation.provider}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedConversation.leadId ? (
                      <Button
                        className="rounded-lg border-[var(--ether-outline-variant)] bg-white"
                        render={<Link href={`/dashboard/leads?leadId=${selectedConversation.leadId}`} />}
                        size="sm"
                        variant="outline"
                      >
                        <AppIcon name="person" />
                        Open lead
                      </Button>
                    ) : null}
                    <Button
                      className="rounded-lg border-[var(--ether-outline-variant)] bg-white"
                      onClick={() => setShowLeadDetails((current) => !current)}
                      size="icon-sm"
                      title={showLeadDetails ? "Close lead details" : "Open lead details"}
                      variant="outline"
                    >
                      <AppIcon name={showLeadDetails ? "close" : "info"} />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[var(--ether-surface)] px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-3xl space-y-4">
                  <div className="flex items-center gap-3 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ether-outline)]">
                    <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ether-outline-variant)_45%,transparent)]" />
                    Conversation
                    <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--ether-outline-variant)_45%,transparent)]" />
                  </div>
                  {selectedConversation.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                  {localReplies.map((message) => <LocalBubble key={message.id} message={message} />)}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_32%,transparent)] bg-white p-3 sm:p-4">
                <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[var(--ether-outline-variant)] bg-[var(--ether-surface-container-low)] shadow-[var(--shadow-surface-1)] focus-within:ring-2 focus-within:ring-[var(--ether-primary)]/20">
                  <Textarea
                    className="min-h-24 resize-none border-0 bg-transparent px-4 pt-4 shadow-none focus-visible:ring-0"
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        if (body.trim() || files.length) void sendReply()
                      }
                    }}
                    placeholder={`Message ${selectedConversation.leadName || selectedConversation.number}`}
                    value={body}
                  />

                  {showAttachments ? (
                    <div className="border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] bg-white/60 p-3">
                      <Input multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />
                      <p className="mt-2 text-xs text-[var(--ether-outline)]">{files.length ? `${files.length} MMS attachment(s) selected` : "Choose files for MMS"}</p>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        className="rounded-lg"
                        onClick={() => setShowAttachments((current) => !current)}
                        size="icon-sm"
                        variant={showAttachments ? "secondary" : "ghost"}
                      >
                        <AppIcon name="attach_file" />
                      </Button>
                      <span className="text-xs text-[var(--ether-outline)]">Enter to send ? Shift+Enter for a new line</span>
                    </div>
                    <Button
                      className="rounded-full bg-[var(--ether-primary)] text-white"
                      disabled={sendMutation.isPending || (!body.trim() && !files.length)}
                      onClick={() => void sendReply()}
                      size="icon"
                    >
                      <AppIcon name="send" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : <EmptyConversation />}
        </section>

        {showLeadDetails ? (
          <aside className="hidden min-h-0 overflow-y-auto border-l border-[color-mix(in_srgb,var(--ether-outline-variant)_32%,transparent)] bg-white lg:block">
            {selectedConversation ? (
              <div className="flex min-h-full flex-col p-5">
                <div className="flex items-center justify-end">
                  <button
                    className="flex size-9 items-center justify-center rounded-full text-[var(--ether-on-surface-variant)] transition hover:bg-[var(--ether-surface-container-high)]"
                    onClick={() => setShowLeadDetails(false)}
                    title="Close lead details"
                    type="button"
                  >
                    <AppIcon name="close" />
                  </button>
                </div>

                <div className="text-center">
                  <div className="relative mx-auto w-fit">
                    <Avatar className="size-20 text-2xl" value={selectedConversation.leadName || selectedConversation.number} />
                    <span className="absolute bottom-1 right-0 size-4 rounded-full border-2 border-white bg-[var(--ether-secondary)]" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-[var(--ether-on-surface)]">{selectedConversation.leadName || "Unknown contact"}</h3>
                  <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">{selectedConversation.number}</p>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                  <Metric label="Messages" value={selectedConversation.messages.length} />
                  <Metric label="Incoming" value={selectedConversation.messages.filter((item) => item.direction === "Incoming").length} />
                </div>

                <div className="mt-6 space-y-5 border-t border-[color-mix(in_srgb,var(--ether-outline-variant)_30%,transparent)] pt-5 text-sm">
                  <div>
                    <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Provider</p>
                    <p className="mt-2 font-semibold text-[var(--ether-on-surface)]">{selectedConversation.provider || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Last activity</p>
                    <p className="mt-2 font-semibold text-[var(--ether-on-surface)]">{formatDateTimeLabel(selectedConversation.latest.occurredAt || selectedConversation.latest.createdAt)}</p>
                  </div>
                  <div>
                    <p className="ether-label-caps text-[10px] text-[var(--ether-outline)]">Status</p>
                    <p className="mt-2 flex items-center gap-2 font-semibold text-[var(--ether-on-surface)]"><span className="size-2 rounded-full bg-[var(--ether-secondary)]" />{selectedConversation.latest.status}</p>
                  </div>
                </div>

                <div className="mt-auto grid gap-3 pt-8">
                  {selectedConversation.leadId ? (
                    <>
                      <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)]" render={<Link href={`/dashboard/leads?leadId=${selectedConversation.leadId}`} />} variant="outline"><AppIcon name="person" />Open lead</Button>
                      <Button className="h-11 rounded-lg border-[var(--ether-outline-variant)]" render={<Link href={`/dashboard/lead-history?leadId=${selectedConversation.leadId}`} />} variant="outline"><AppIcon name="timeline" />Open history</Button>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[var(--ether-outline-variant)] p-4 text-center text-xs text-[var(--ether-outline)]">This number is not linked to a lead.</div>
                  )}
                </div>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-xl overflow-hidden rounded-[20px] border-0 p-0 shadow-[0_30px_90px_rgba(11,28,48,0.24)]">
          <DialogHeader className="border-b border-[var(--ether-outline-variant)] px-5 py-4">
            <DialogTitle className="text-xl font-bold">New text message</DialogTitle>
            <DialogDescription>Start a new SMS or MMS conversation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => setNewTo(event.target.value)} placeholder="Phone number" value={newTo} />
            <Textarea className="min-h-40 resize-none rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => setNewBody(event.target.value)} placeholder="Write a message" value={newBody} />
            <Input multiple onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))} type="file" />
          </div>
          <div className="flex items-center justify-between border-t border-[var(--ether-outline-variant)] px-5 py-4">
            <span className="text-xs text-[var(--ether-outline)]">{newFiles.length ? `${newFiles.length} attachment(s)` : "SMS without attachments"}</span>
            <Button className="rounded-lg bg-[var(--ether-primary)] text-white" disabled={sendMutation.isPending || !newTo.trim() || (!newBody.trim() && !newFiles.length)} onClick={() => void sendNew()}>
              {sendMutation.isPending ? "Sending..." : newFiles.length ? "Send MMS" : "Send SMS"}<AppIcon name="send" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ConversationRow({ active, item, onClick }: { active: boolean; item: Conversation; onClick: () => void }) {
  return (
    <button className={`grid w-full grid-cols-[2.75rem_minmax(0,1fr)] gap-3 border-b px-4 py-3 text-left transition-colors ${active ? "bg-primary/8" : "hover:bg-muted/40"}`} onClick={onClick} type="button">
      <Avatar value={item.leadName || item.number} />
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">{item.leadName || item.number}</span>
          <span className="shrink-0 text-[11px] text-muted-foreground">{shortDate(item.latest.occurredAt || item.latest.createdAt)}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">{item.latest.direction === "Outgoing" ? "You: " : ""}{item.latest.body || "Attachment"}</span>
        <span className="mt-2 flex items-center gap-2"><Badge className="h-5 px-1.5 text-[10px]" variant="outline">{item.provider || "SMS"}</Badge>{item.leadName ? <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">Lead</Badge> : null}</span>
      </span>
    </button>
  )
}

function MessageBubble({ message }: { message: SmsMessageItem }) {
  const outgoing = message.direction === "Outgoing"
  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${outgoing ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-background"}`}>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.body || "Attachment"}</p>
        {message.mediaUrls.length ? <div className="mt-3 grid gap-2">{message.mediaUrls.map((url) => <InlineAttachment key={url} outgoing={outgoing} url={url} />)}</div> : null}
        <p className={`mt-2 text-right text-[10px] ${outgoing ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{shortTime(message.occurredAt || message.createdAt)}</p>
      </div>
    </div>
  )
}

function LocalBubble({ message }: { message: LocalReply }) {
  return <div className="flex justify-end"><div className="max-w-[82%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-primary-foreground shadow-sm"><p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>{message.mediaUrls.length ? <div className="mt-3 grid gap-2">{message.mediaUrls.map((url) => <InlineAttachment key={url} outgoing url={url} />)}</div> : null}<p className="mt-2 text-right text-[10px] text-primary-foreground/70">{shortTime(message.createdAt)}</p></div></div>
}

function InlineAttachment({ outgoing, url }: { outgoing: boolean; url: string }) {
  const [failed, setFailed] = useState(false)
  const contentType = attachmentContentType(url)
  const frameClass = "max-h-[22rem] w-full max-w-sm rounded-xl object-contain"

  if (contentType.startsWith("video/")) {
    return <video className={frameClass} controls preload="metadata" src={url}>Video attachment</video>
  }
  if (contentType.startsWith("audio/")) {
    return <audio className="w-full max-w-sm" controls preload="metadata" src={url}>Audio attachment</audio>
  }
  if (!failed && (!contentType || contentType.startsWith("image/"))) {
    return <a className="block overflow-hidden rounded-xl" href={url} rel="noreferrer" target="_blank"><img alt="MMS attachment" className={frameClass} loading="lazy" onError={() => setFailed(true)} src={url} /></a>
  }
  return <a className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${outgoing ? "border-primary-foreground/40 text-primary-foreground" : "text-foreground"}`} href={url} rel="noreferrer" target="_blank"><AppIcon name="download" />Download attachment</a>
}

function attachmentContentType(url: string) {
  try {
    return new URL(url, "http://local").searchParams.get("contentType")?.toLowerCase() ?? ""
  } catch {
    return ""
  }
}

function Avatar({ className = "", value }: { className?: string; value: string }) {
  return <span className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary ${className}`}>{(value || "?").slice(0, 1).toUpperCase()}</span>
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border bg-background p-3"><p className="text-xl font-semibold">{value}</p><p className="mt-1 text-muted-foreground">{label}</p></div>
}


function EmptyState({ text }: { text: string }) {
  return <div className="flex h-full min-h-64 items-center justify-center p-8 text-center"><div><span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-muted/30"><AppIcon name="sms" /></span><p className="mt-3 text-sm text-muted-foreground">{text}</p></div></div>
}

function EmptyConversation() {
  return <div className="flex h-full items-center justify-center p-8 text-center"><div><span className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-muted/30"><AppIcon name="forum" /></span><h2 className="mt-4 font-semibold">Choose a conversation</h2><p className="mt-1 max-w-sm text-sm text-muted-foreground">The complete thread appears here with the reply box fixed at the bottom.</p></div></div>
}

function groupConversations(messages: SmsMessageItem[]) {
  const groups = new Map<string, SmsMessageItem[]>()
  for (const message of messages) groups.set(conversationKey(message), [...(groups.get(conversationKey(message)) ?? []), message])
  return [...groups.entries()].map(([key, items]) => {
    const ordered = [...items].sort((left, right) => messageTime(left) - messageTime(right))
    const latest = ordered[ordered.length - 1]
    return { key, number: counterparty(latest), leadId: latest.leadId, leadName: latest.leadName, provider: latest.provider, latest, messages: ordered } satisfies Conversation
  }).sort((left, right) => messageTime(right.latest) - messageTime(left.latest))
}

function conversationKey(message: SmsMessageItem) {
  return message.leadId ? `lead:${message.leadId}` : `phone:${counterparty(message).replace(/\D/g, "") || counterparty(message).toLowerCase()}`
}

function counterparty(message: SmsMessageItem) {
  return message.direction === "Incoming" ? message.fromNumber : message.toNumber
}

function messageTime(message: SmsMessageItem) {
  return new Date(message.occurredAt || message.createdAt).getTime()
}

function shortDate(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toDateString() === new Date().toDateString() ? shortTime(value) : date.toLocaleDateString([], { month: "short", day: "numeric" })
}

function shortTime(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}
