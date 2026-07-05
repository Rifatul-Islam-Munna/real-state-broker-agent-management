"use client"

import Link from "next/link"
import type { KeyboardEventHandler } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import PostalMime from "postal-mime"

import type { MailInboxItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useConvertMailInboxToLead,
  useCreateMailInboxItem,
  useDocumentRepository,
  useMailInbox,
  useMailInboxItem,
  useMailInboxSyncStatus,
  useRunMailInboxSync,
  useSendMailMessage,
} from "@/hooks/use-real-estate-api"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { uploadPropertyAsset } from "@/lib/upload-client"

const PAGE_SIZE = 50

type OptimisticReply = {
  body: string
  htmlBody?: string
  createdAt: string
  attachmentCount: number
}

type ComposeState = {
  open: boolean
  to: string
  subject: string
  message: string
  htmlBody: string
  files: File[]
}

const emptyCompose: ComposeState = {
  open: false,
  to: "",
  subject: "",
  message: "",
  htmlBody: "",
  files: [],
}

export function ProfessionalMailInboxPage() {
  return <ProfessionalMailWorkspace />
}

export function ProfessionalMailDetailPage({ mailId }: { mailId: number }) {
  return <ProfessionalMailWorkspace initialMailId={mailId} />
}

function ProfessionalMailWorkspace({ initialMailId }: { initialMailId?: number }) {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | "New" | "Replied" | "Converted">("all")
  const [selectedId, setSelectedId] = useState<number | null>(initialMailId ?? null)
  const [compose, setCompose] = useState<ComposeState>(emptyCompose)
  const [reply, setReply] = useState("")
  const [replyFiles, setReplyFiles] = useState<File[]>([])
  const [documentIds, setDocumentIds] = useState<number[]>([])
  const [pdfTemplateId, setPdfTemplateId] = useState("")
  const [attachmentDrawerOpen, setAttachmentDrawerOpen] = useState(false)
  const [optimisticReplies, setOptimisticReplies] = useState<OptimisticReply[]>([])
  const threadBottomRef = useRef<HTMLDivElement | null>(null)

  const inboxQuery = useMailInbox({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status === "all" ? undefined : status,
  })
  const selectedQuery = useMailInboxItem(selectedId ?? undefined)
  const syncStatusQuery = useMailInboxSyncStatus()
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const pdfQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const syncMutation = useRunMailInboxSync()
  const sendMutation = useSendMailMessage()
  const createInboxMutation = useCreateMailInboxItem()
  const convertMutation = useConvertMailInboxToLead()

  const messages = inboxQuery.data?.items ?? []
  const selected = selectedQuery.data ?? messages.find((item) => item.id === selectedId) ?? null
  const documents = documentsQuery.data?.items ?? []
  const pdfTemplates = (pdfQuery.data?.items ?? []).filter((item) => item.status !== "Archived")

  useEffect(() => {
    if (selectedId || !messages.length) return
    setSelectedId(messages[0].id)
  }, [messages, selectedId])

  useEffect(() => {
    setOptimisticReplies([])
    setReply("")
    setReplyFiles([])
    setDocumentIds([])
    setPdfTemplateId("")
    setAttachmentDrawerOpen(false)
  }, [selectedId])

  const thread = useMemo(() => {
    if (!selected) return []
    return messages
      .filter((item) => sameMailThread(item, selected))
      .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  }, [messages, selected])

  const stats = useMemo(
    () => ({
      all: inboxQuery.data?.totalCount ?? messages.length,
      new: messages.filter((item) => item.status === "New").length,
      replied: messages.filter((item) => item.status === "Replied").length,
      converted: messages.filter((item) => item.status === "Converted").length,
    }),
    [inboxQuery.data?.totalCount, messages]
  )

  function chooseMessage(id: number) {
    setSelectedId(id)
    router.replace(`/dashboard/mail/${id}`, { scroll: false })
  }

  async function sendReply() {
    if (!selected) return
    const uploads = await Promise.all(
      replyFiles.map((file) => uploadPropertyAsset(file, "mail-attachments"))
    )
    const savedDocumentUrls = documents
      .filter((item) => documentIds.includes(item.id))
      .map((item) => item.fileUrl)
      .filter(Boolean)
    const response = await sendMutation.mutateAsync({
      to: selected.email,
      subject: normalizeReplySubject(selected.subject),
      message: htmlToText(reply),
      htmlBody: reply,
      attachmentUrls: [
        ...uploads.map((item) => item.url),
        ...savedDocumentUrls,
      ],
      pdfTemplateId: pdfTemplateId || undefined,
    })
    if (response.error) return
    setOptimisticReplies((current) => [
      ...current,
      {
        body: htmlToText(reply) || "Attachment sent.",
        htmlBody: reply,
        createdAt: new Date().toISOString(),
        attachmentCount:
          uploads.length + savedDocumentUrls.length + (pdfTemplateId ? 1 : 0),
      },
    ])
    setReply("")
    setReplyFiles([])
    setDocumentIds([])
    setPdfTemplateId("")
    setAttachmentDrawerOpen(false)
    requestAnimationFrame(() =>
      threadBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    )
  }

  async function sendNewMail() {
    const uploads = await Promise.all(
      compose.files.map((file) => uploadPropertyAsset(file, "mail-attachments"))
    )
    const response = await sendMutation.mutateAsync({
      to: compose.to.trim(),
      subject: compose.subject.trim(),
      message: compose.message.trim(),
      htmlBody: compose.htmlBody,
      attachmentUrls: uploads.map((item) => item.url),
    })
    if (!response.error) setCompose(emptyCompose)
  }

  async function importEml(file?: File | null) {
    if (!file) return
    const parsed = await PostalMime.parse(await file.text(), {
      attachmentEncoding: "base64",
    })
    const from = parsed.from && "address" in parsed.from ? parsed.from : null
    const htmlBody = parsed.html ?? ""
    const response = await createInboxMutation.mutateAsync({
      email: from?.address ?? "",
      name: from?.name || from?.address || "Imported sender",
      subject: parsed.subject || file.name.replace(/\.eml$/i, ""),
      message: parsed.text || htmlToText(htmlBody),
      htmlBody,
      kind: "Direct",
    })
    if (response.data) chooseMessage(response.data.id)
  }

  const error =
    inboxQuery.error ?? selectedQuery.error ?? syncStatusQuery.error ?? sendMutation.error

  return (
    <main className="h-[calc(100dvh-4rem)] min-h-[720px] overflow-hidden bg-muted/20 p-3 lg:p-5">
      <div className="mx-auto grid h-full max-w-[1700px] overflow-hidden rounded-2xl border bg-background shadow-sm lg:grid-cols-[230px_390px_minmax(0,1fr)]">
        <aside className="hidden min-h-0 border-r bg-muted/10 lg:flex lg:flex-col">
          <div className="border-b p-4">
            <Button
              className="w-full justify-start rounded-xl"
              onClick={() => setCompose({ ...emptyCompose, open: true })}
              size="lg"
            >
              <AppIcon name="edit" />
              Compose
            </Button>
          </div>
          <nav className="space-y-1 p-3">
            <FolderButton
              active={status === "all"}
              count={stats.all}
              icon="inbox"
              label="Inbox"
              onClick={() => setStatus("all")}
            />
            <FolderButton
              active={status === "New"}
              count={stats.new}
              icon="mark_email_unread"
              label="New"
              onClick={() => setStatus("New")}
            />
            <FolderButton
              active={status === "Replied"}
              count={stats.replied}
              icon="reply"
              label="Replied"
              onClick={() => setStatus("Replied")}
            />
            <FolderButton
              active={status === "Converted"}
              count={stats.converted}
              icon="person_add"
              label="Converted"
              onClick={() => setStatus("Converted")}
            />
          </nav>
          <div className="mt-auto space-y-3 border-t p-4 text-xs">
            <div className="rounded-xl border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">Mailbox sync</span>
                <span
                  className={`size-2 rounded-full ${
                    syncStatusQuery.data?.syncEnabled ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
              </div>
              <p className="mt-2 leading-5 text-muted-foreground">
                {syncStatusQuery.data?.statusMessage ?? "Checking connection..."}
              </p>
              <Button
                className="mt-3 w-full"
                disabled={
                  syncMutation.isPending ||
                  syncStatusQuery.data?.isRunning ||
                  !syncStatusQuery.data?.isConfigured
                }
                onClick={() => void syncMutation.mutateAsync()}
                size="sm"
                variant="outline"
              >
                <AppIcon name="sync" />
                {syncMutation.isPending ? "Syncing" : "Sync now"}
              </Button>
            </div>
            <Button
              className="w-full justify-start"
              render={<Link href="/dashboard/lead-collection-templates" />}
              size="sm"
              variant="ghost"
            >
              <AppIcon name="document_scanner" />
              Lead parsers
            </Button>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-medium hover:bg-muted">
              <AppIcon name="upload_file" />
              Import .eml
              <input
                accept=".eml,message/rfc822"
                className="sr-only"
                onChange={(event) => void importEml(event.target.files?.[0])}
                type="file"
              />
            </label>
          </div>
        </aside>

        <section className="flex min-h-0 flex-col border-r">
          <header className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Unified mailbox
                </p>
                <h1 className="text-xl font-bold">Mail</h1>
              </div>
              <div className="flex gap-2 lg:hidden">
                <Button
                  onClick={() => setCompose({ ...emptyCompose, open: true })}
                  size="icon-sm"
                >
                  <AppIcon name="edit" />
                </Button>
                <Button
                  disabled={syncMutation.isPending}
                  onClick={() => void syncMutation.mutateAsync()}
                  size="icon-sm"
                  variant="outline"
                >
                  <AppIcon name="sync" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <AppIcon
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="rounded-xl bg-muted/30 pl-9"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search mail"
                value={search}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto lg:hidden">
              {(["all", "New", "Replied", "Converted"] as const).map((item) => (
                <Button
                  key={item}
                  onClick={() => setStatus(item)}
                  size="sm"
                  variant={status === item ? "secondary" : "outline"}
                >
                  {item === "all" ? "Inbox" : item}
                </Button>
              ))}
            </div>
          </header>

          {error ? (
            <Alert className="m-3" variant="destructive">
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {inboxQuery.isLoading && !messages.length ? (
              <EmptyList icon="hourglass_empty" text="Loading your mailbox..." />
            ) : messages.length === 0 ? (
              <EmptyList icon="inbox" text="No messages match this view." />
            ) : (
              messages.map((item) => (
                <MailListRow
                  active={item.id === selectedId}
                  item={item}
                  key={item.id}
                  onClick={() => chooseMessage(item.id)}
                />
              ))
            )}
          </div>

          <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>
              Page {page} of {Math.max(1, inboxQuery.data?.totalPages ?? 1)}
            </span>
            <div className="flex gap-1">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                size="icon-sm"
                variant="ghost"
              >
                <AppIcon name="chevron_left" />
              </Button>
              <Button
                disabled={!inboxQuery.data?.hasNextPage}
                onClick={() => setPage((current) => current + 1)}
                size="icon-sm"
                variant="ghost"
              >
                <AppIcon name="chevron_right" />
              </Button>
            </div>
          </footer>
        </section>

        <section className="hidden min-h-0 flex-col md:flex">
          {selected ? (
            <>
              <header className="border-b px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold">{selected.subject}</h2>
                      <Badge variant={selected.status === "New" ? "default" : "outline"}>
                        {selected.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selected.name || selected.email} · {selected.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      render={
                        <Link
                          href={`/dashboard/lead-collection-templates/new?mailInboxId=${selected.id}`}
                        />
                      }
                      size="sm"
                      variant="outline"
                    >
                      <AppIcon name="document_scanner" />
                      Create parser
                    </Button>
                    {selected.leadId ? (
                      <Button
                        render={<Link href={`/dashboard/leads?leadId=${selected.leadId}`} />}
                        size="sm"
                        variant="outline"
                      >
                        <AppIcon name="person" />
                        Open lead
                      </Button>
                    ) : (
                      <Button
                        disabled={convertMutation.isPending}
                        onClick={() =>
                          void convertMutation.mutateAsync({ mailInboxId: selected.id })
                        }
                        size="sm"
                        variant="outline"
                      >
                        <AppIcon name="person_add" />
                        Convert lead
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.extractionMethod ? (
                    <Badge variant="secondary">
                      {selected.extractionMethod} · {Math.round((selected.extractionConfidence ?? 0) * 100)}%
                    </Badge>
                  ) : null}
                  {selected.leadCollectionTemplateName ? (
                    <Badge variant="outline">{selected.leadCollectionTemplateName}</Badge>
                  ) : null}
                  {selected.aiFallbackUsed ? (
                    <Badge variant="outline">AI fallback</Badge>
                  ) : null}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto bg-muted/10 px-4 py-5 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-4">
                  {thread.map((item) => (
                    <MailMessageCard item={item} key={item.id} />
                  ))}
                  {optimisticReplies.map((item) => (
                    <OutgoingMailCard item={item} key={item.createdAt} />
                  ))}
                  <div ref={threadBottomRef} />
                </div>
              </div>

              <div className="border-t bg-background p-3 sm:p-4">
                <div className="mx-auto max-w-4xl rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring/30">
                  <RichMailEditor
                    className="min-h-24"
                    onChange={(html, text) => setReply(html.trim() ? html : text)}
                    onKeyDown={(event) => {
                      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                        event.preventDefault()
                        void sendReply()
                      }
                    }}
                    placeholder={`Reply to ${selected.name || selected.email}`}
                    value={reply}
                  />
                  {attachmentDrawerOpen ? (
                    <AttachmentDrawer
                      documentIds={documentIds}
                      documents={documents}
                      files={replyFiles}
                      onDocumentIdsChange={setDocumentIds}
                      onFilesChange={setReplyFiles}
                      onPdfTemplateChange={setPdfTemplateId}
                      pdfTemplateId={pdfTemplateId}
                      pdfTemplates={pdfTemplates}
                    />
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        aria-label="Add attachments"
                        onClick={() => setAttachmentDrawerOpen((current) => !current)}
                        size="icon-sm"
                        variant={attachmentDrawerOpen ? "secondary" : "ghost"}
                      >
                        <AppIcon name="attach_file" />
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Ctrl/⌘ + Enter to send
                      </span>
                    </div>
                    <Button
                      className="rounded-full px-5"
                      disabled={
                        sendMutation.isPending ||
                        (!htmlToText(reply).trim() &&
                          !replyFiles.length &&
                          !documentIds.length &&
                          !pdfTemplateId)
                      }
                      onClick={() => void sendReply()}
                    >
                      {sendMutation.isPending ? "Sending..." : "Send"}
                      <AppIcon name="send" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div>
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-muted/30">
                  <AppIcon name="mail" />
                </span>
                <h2 className="mt-4 font-semibold">Select a conversation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open a message to read the full thread and reply from the bottom composer.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={compose.open}
        onOpenChange={(open) => setCompose((current) => ({ ...current, open }))}
      >
        <DialogContent className="max-w-2xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle>New message</DialogTitle>
            <DialogDescription>Compose a professional email with optional attachments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 px-5 py-4">
            <Input
              onChange={(event) =>
                setCompose((current) => ({ ...current, to: event.target.value }))
              }
              placeholder="To"
              type="email"
              value={compose.to}
            />
            <Input
              onChange={(event) =>
                setCompose((current) => ({ ...current, subject: event.target.value }))
              }
              placeholder="Subject"
              value={compose.subject}
            />
            <RichMailEditor
              className="min-h-64 rounded-xl border"
              onChange={(html, text) =>
                setCompose((current) => ({ ...current, htmlBody: html, message: text }))
              }
              placeholder="Write your message"
              value={compose.htmlBody}
            />
            <Input
              multiple
              onChange={(event) =>
                setCompose((current) => ({
                  ...current,
                  files: Array.from(event.target.files ?? []),
                }))
              }
              type="file"
            />
          </div>
          <div className="flex items-center justify-between border-t px-5 py-3">
            <span className="text-xs text-muted-foreground">
              {compose.files.length
                ? `${compose.files.length} attachment(s)`
                : "No attachments"}
            </span>
            <Button
              disabled={
                sendMutation.isPending ||
                !compose.to.trim() ||
                !compose.subject.trim() ||
                (!compose.message.trim() && !compose.files.length)
              }
              onClick={() => void sendNewMail()}
            >
              {sendMutation.isPending ? "Sending..." : "Send message"}
              <AppIcon name="send" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function FolderButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean
  count: number
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
      onClick={onClick}
      type="button"
    >
      <AppIcon name={icon} />
      <span>{label}</span>
      <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  )
}

function MailListRow({
  active,
  item,
  onClick,
}: {
  active: boolean
  item: MailInboxItem
  onClick: () => void
}) {
  return (
    <button
      className={`grid w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-3 border-b px-4 py-3 text-left transition-colors ${
        active ? "bg-primary/8" : "hover:bg-muted/40"
      }`}
      onClick={onClick}
      type="button"
    >
      <Avatar value={item.name || item.email} />
      <span className="min-w-0">
        <span className="flex items-center justify-between gap-3">
          <span className={`truncate text-sm ${item.status === "New" ? "font-bold" : "font-medium"}`}>
            {item.name || item.email}
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {shortDate(item.createdAt)}
          </span>
        </span>
        <span className={`mt-0.5 block truncate text-sm ${item.status === "New" ? "font-semibold" : ""}`}>
          {item.subject || "No subject"}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {plainSnippet(item.message || item.htmlBody || "")}
        </span>
        <span className="mt-2 flex flex-wrap gap-1.5">
          <Badge className="h-5 px-1.5 text-[10px]" variant="outline">
            {item.status}
          </Badge>
          {item.extractionMethod ? (
            <Badge className="h-5 px-1.5 text-[10px]" variant="secondary">
              {item.extractionMethod}
            </Badge>
          ) : null}
        </span>
      </span>
    </button>
  )
}

function MailMessageCard({ item }: { item: MailInboxItem }) {
  return (
    <Card className="overflow-hidden shadow-none">
      <CardContent className="p-0">
        <div className="flex items-start gap-3 border-b px-4 py-3">
          <Avatar value={item.name || item.email} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{item.name || item.email}</p>
                <p className="text-xs text-muted-foreground">{item.email} · to me</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTimeLabel(item.createdAt)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <MailBody html={item.htmlBody} text={item.message} />
        </div>
      </CardContent>
    </Card>
  )
}

function OutgoingMailCard({ item }: { item: OptimisticReply }) {
  return (
    <Card className="ml-auto max-w-[92%] border-primary/20 bg-primary/[0.03] shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              You
            </span>
            <p className="font-semibold">Sent reply</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDateTimeLabel(item.createdAt)}
          </p>
        </div>
        <div className="mt-3 text-sm leading-6">
          <MailBody html={item.htmlBody} text={item.body} />
        </div>
        {item.attachmentCount ? (
          <Badge className="mt-3" variant="outline">
            {item.attachmentCount} attachment(s)
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}

function RichMailEditor({
  className = "",
  onChange,
  onKeyDown,
  placeholder,
  value,
}: {
  className?: string
  onChange: (html: string, text: string) => void
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
  placeholder: string
  value: string
}) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (editor.innerHTML !== value) editor.innerHTML = value
  }, [value])

  function emit() {
    const html = editorRef.current?.innerHTML ?? ""
    onChange(html, htmlToText(html))
  }

  function run(command: string, input?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, input)
    emit()
  }

  function addSignature() {
    run(
      "insertHTML",
      `<br><br><div style="font-family:Arial,sans-serif;color:#111827"><strong>Best regards,</strong><br><span>Your Name</span><br><span>Real Estate Team</span><br><a href="mailto:you@example.com">you@example.com</a> | <span>+1 (555) 000-0000</span></div>`
    )
  }

  return (
    <div className={`overflow-hidden bg-background ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
        <Button onClick={() => run("bold")} size="icon-sm" type="button" variant="ghost"><AppIcon name="format_bold" /></Button>
        <Button onClick={() => run("italic")} size="icon-sm" type="button" variant="ghost"><AppIcon name="format_italic" /></Button>
        <Button onClick={() => run("insertUnorderedList")} size="icon-sm" type="button" variant="ghost"><AppIcon name="format_list_bulleted" /></Button>
        <Button onClick={() => run("createLink", window.prompt("Link URL") || "")} size="icon-sm" type="button" variant="ghost"><AppIcon name="link" /></Button>
        <Button onClick={addSignature} size="sm" type="button" variant="ghost">
          <AppIcon name="signature" />
          Signature
        </Button>
      </div>
      <div
        className="min-h-[inherit] px-4 py-3 text-sm leading-6 outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
        contentEditable
        data-placeholder={placeholder}
        onInput={emit}
        onKeyDown={onKeyDown}
        ref={editorRef}
        suppressContentEditableWarning
      />
    </div>
  )
}

function AttachmentDrawer({
  documentIds,
  documents,
  files,
  onDocumentIdsChange,
  onFilesChange,
  onPdfTemplateChange,
  pdfTemplateId,
  pdfTemplates,
}: {
  documentIds: number[]
  documents: Array<{ id: number; title: string; category: string; documentType: string }>
  files: File[]
  onDocumentIdsChange: (value: number[]) => void
  onFilesChange: (value: File[]) => void
  onPdfTemplateChange: (value: string) => void
  pdfTemplateId: string
  pdfTemplates: Array<{ id: number; name: string; category: string }>
}) {
  return (
    <div className="grid gap-3 border-t bg-muted/10 p-3 lg:grid-cols-3">
      <label className="space-y-2 text-xs font-medium">
        <span>Upload files</span>
        <Input
          multiple
          onChange={(event) => onFilesChange(Array.from(event.target.files ?? []))}
          type="file"
        />
        <span className="block text-muted-foreground">{files.length} selected</span>
      </label>
      <div className="space-y-2 text-xs font-medium">
        <span>Saved documents</span>
        <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border bg-background p-2">
          {documents.slice(0, 50).map((item) => (
            <label className="flex items-start gap-2" key={item.id}>
              <input
                checked={documentIds.includes(item.id)}
                onChange={(event) =>
                  onDocumentIdsChange(
                    event.target.checked
                      ? [...documentIds, item.id]
                      : documentIds.filter((id) => id !== item.id)
                  )
                }
                type="checkbox"
              />
              <span className="line-clamp-2">{item.title}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="space-y-2 text-xs font-medium">
        <span>Generated PDF</span>
        <Select
          onValueChange={(value) => onPdfTemplateChange(value === "none" ? "" : value)}
          value={pdfTemplateId || "none"}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No PDF</SelectItem>
            {pdfTemplates.map((item) => (
              <SelectItem key={item.id} value={String(item.id)}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  )
}

function MailBody({ html, text }: { html?: string; text: string }) {
  if (html?.trim()) {
    return (
      <iframe
        className="h-[420px] w-full rounded-xl border bg-white"
        sandbox=""
        srcDoc={safeMailDocument(html)}
        title="Email content"
      />
    )
  }
  return <p className="whitespace-pre-wrap text-sm leading-7">{text}</p>
}

function Avatar({ value }: { value: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {(value || "?").slice(0, 1).toUpperCase()}
    </span>
  )
}

function EmptyList({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex h-full min-h-64 items-center justify-center p-8 text-center">
      <div>
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-muted/30">
          <AppIcon name={icon} />
        </span>
        <p className="mt-3 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function sameMailThread(left: MailInboxItem, right: MailInboxItem) {
  if (left.id === right.id) return true
  if (left.leadId && right.leadId && left.leadId === right.leadId) return true
  return (
    left.email.toLowerCase() === right.email.toLowerCase() &&
    normalizeSubject(left.subject) === normalizeSubject(right.subject)
  )
}

function normalizeSubject(value: string) {
  return value
    .toLowerCase()
    .replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "")
    .trim()
}

function normalizeReplySubject(value: string) {
  return /^\s*re\s*:/i.test(value) ? value : `Re: ${value}`
}

function plainSnippet(value: string) {
  return htmlToText(value).replace(/\s+/g, " ").trim().slice(0, 160)
}

function htmlToText(value: string) {
  return `${value ?? ""}`
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim()
}

function safeMailDocument(html: string) {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
  return `<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#fff;color:#111;font:14px Arial,sans-serif}body{padding:16px}img{max-width:100%;height:auto}table{max-width:100%}a{color:#2563eb}</style></head><body>${clean}</body></html>`
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" })
}
