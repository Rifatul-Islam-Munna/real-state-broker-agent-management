"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import PostalMime from "postal-mime"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import {
  useConvertMailInboxToLead,
  useCreateMailInboxItem,
  useMailInbox,
  useMailInboxItem,
  useMailInboxSyncStatus,
  useDocumentRepository,
  useRunMailInboxSync,
  useSendMailMessage,
  useUpdateMailInboxItem,
} from "@/hooks/use-real-estate-api"
import type { MailInboxItem } from "@/@types/real-estate-api"
import { usePdfTemplates } from "@/hooks/use-pdfs-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { getPortalRoutes } from "@/lib/portal-routes"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { uploadPropertyAsset } from "@/lib/upload-client"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PAGE_SIZE = 10

function buildHistoryHref(baseHref: string, leadId: number) {
  return `${baseHref}${baseHref.includes("?") ? "&" : "?"}leadId=${leadId}`
}

function mailFrameDoc(html: string) {
  const clean = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "")
  return `<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#fff;color:#111;font:14px Arial,sans-serif}body{padding:16px}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${clean}</body></html>`
}

function MailRender({ html, text, compact = false }: { html?: string; text: string; compact?: boolean }) {
  if (html?.trim()) {
    return (
      <iframe
        className={`${compact ? "h-36" : "h-[58dvh]"} w-full rounded-xl border bg-white`}
        sandbox=""
        srcDoc={mailFrameDoc(html)}
        title="Email content"
      />
    )
  }
  return <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{text}</p>
}

function MiniRichMailEditor({
  className = "",
  onChange,
  placeholder,
  value,
}: {
  className?: string
  onChange: (html: string) => void
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
    onChange(editorRef.current?.innerHTML ?? "")
  }

  function run(command: string, input?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, input)
    emit()
  }

  function signature() {
    run("insertHTML", `<br><br><div style="font-family:Arial,sans-serif;color:#111827"><strong>Best regards,</strong><br><span>Your Name</span><br><span>Real Estate Team</span><br><a href="mailto:you@example.com">you@example.com</a> | <span>+1 (555) 000-0000</span></div>`)
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
        <button className="rounded px-2 py-1 text-sm font-bold hover:bg-slate-100" onClick={() => run("bold")} type="button">B</button>
        <button className="rounded px-2 py-1 text-sm italic hover:bg-slate-100" onClick={() => run("italic")} type="button">I</button>
        <button className="rounded px-2 py-1 text-sm hover:bg-slate-100" onClick={() => run("insertUnorderedList")} type="button">List</button>
        <button className="rounded px-2 py-1 text-sm hover:bg-slate-100" onClick={() => run("createLink", window.prompt("Link URL") || "")} type="button">Link</button>
        <button className="rounded px-2 py-1 text-sm hover:bg-slate-100" onClick={signature} type="button">Signature</button>
      </div>
      <div
        className="min-h-[inherit] px-3 py-2 text-sm leading-6 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        contentEditable
        data-placeholder={placeholder}
        onInput={emit}
        ref={editorRef}
        suppressContentEditableWarning
      />
    </div>
  )
}

function htmlToMailText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim()
}

async function parseEmlFile(file: File) {
  const parsed = await PostalMime.parse(await file.text(), { attachmentEncoding: "base64" })
  const from = parsed.from && "address" in parsed.from ? parsed.from : null
  const htmlBody = parsed.html ?? ""
  return {
    email: from?.address ?? "",
    name: from?.name || from?.address || "Imported sender",
    subject: parsed.subject || file.name.replace(/\.eml$/i, ""),
    message: parsed.text || htmlToMailText(htmlBody),
    htmlBody,
    kind: "Direct" as const,
  }
}

export function ManagedMailInboxPage() {
  const pathname = usePathname()
  const router = useRouter()
  const portalRoutes = getPortalRoutes(pathname)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"" | "New" | "Replied" | "Converted">("")
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [mailTo, setMailTo] = useState("")
  const [mailSubject, setMailSubject] = useState("")
  const [mailMessage, setMailMessage] = useState("")
  const [mailFiles, setMailFiles] = useState<File[]>([])
  const [mailDocumentSearch, setMailDocumentSearch] = useState("")
  const [mailDocumentIds, setMailDocumentIds] = useState<number[]>([])
  const [mailPdfTemplateId, setMailPdfTemplateId] = useState("")
  const [mailPdfSearch, setMailPdfSearch] = useState("")

  const mailInboxQuery = useMailInbox({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  })
  const syncStatusQuery = useMailInboxSyncStatus()
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const runSyncMutation = useRunMailInboxSync()
  const convertMailInboxToLead = useConvertMailInboxToLead()
  const createMailInboxItem = useCreateMailInboxItem()
  const sendMail = useSendMailMessage()
  const updateMailInbox = useUpdateMailInboxItem()
  const syncStatus = syncStatusQuery.data
  const isInitialLoading =
    !mailInboxQuery.data && (mailInboxQuery.isLoading || mailInboxQuery.isFetching)

  const mailInbox = useMemo(() => mailInboxQuery.data?.items ?? [], [mailInboxQuery.data?.items])
  const allDocuments = documentsQuery.data?.items ?? []
  const documents = useMemo(() => {
    const search = mailDocumentSearch.trim().toLowerCase()
    return allDocuments.filter((doc) =>
      !search || `${doc.title} ${doc.category} ${doc.documentType}`.toLowerCase().includes(search),
    )
  }, [allDocuments, mailDocumentSearch])
  const pdfTemplates = useMemo(() => {
    const search = mailPdfSearch.trim().toLowerCase()
    return (pdfTemplatesQuery.data?.items ?? [])
      .filter((template) => template.status !== "Archived")
      .filter((template) => !search || `${template.name} ${template.category}`.toLowerCase().includes(search))
  }, [mailPdfSearch, pdfTemplatesQuery.data?.items])

  const stats = useMemo(
    () => [
      {
        label: "New Mail",
        value: `${mailInbox.filter((item) => item.status === "New").length}`,
      },
      {
        label: "Newsletter",
        value: `${mailInbox.filter((item) => item.kind === "Newsletter").length}`,
      },
      {
        label: "Converted",
        value: `${mailInbox.filter((item) => item.status === "Converted").length}`,
      },
    ],
    [mailInbox],
  )

  async function handleSendMail() {
    const uploads = await Promise.all(mailFiles.map((file) => uploadPropertyAsset(file, "mail-attachments")))
    const selectedDocUrls = allDocuments
      .filter((doc) => mailDocumentIds.includes(doc.id))
      .map((doc) => doc.fileUrl)
      .filter(Boolean)
    const response = await sendMail.mutateAsync({
      attachmentUrls: [...uploads.map((upload) => upload.url), ...selectedDocUrls],
      htmlBody: mailMessage,
      message: htmlToMailText(mailMessage),
      pdfTemplateId: mailPdfTemplateId || undefined,
      subject: mailSubject.trim(),
      to: mailTo.trim(),
    })
    if (!response.error) {
      setIsComposeOpen(false)
      setMailFiles([])
      setMailMessage("")
      setMailSubject("")
      setMailTo("")
      setMailDocumentIds([])
      setMailDocumentSearch("")
      setMailPdfTemplateId("")
      setMailPdfSearch("")
    }
  }

  function openMail(mail: MailInboxItem) {
    if (!mail.isRead) {
      void updateMailInbox.mutateAsync({ id: mail.id, isRead: true })
    }
    router.push(`/dashboard/mail/${mail.id}`)
  }

  function openReply(mail: MailInboxItem) {
    setMailTo(mail.email)
    setMailSubject(mail.subject.toLowerCase().startsWith("re:") ? mail.subject : `Re: ${mail.subject}`)
    setMailMessage("")
    setIsComposeOpen(true)
  }

  async function importEml(file?: File | null) {
    if (!file) return
    const payload = await parseEmlFile(file)
    const result = await createMailInboxItem.mutateAsync(payload)
    if (!result.error && result.data) {
      router.push(`/dashboard/mail/${result.data.id}`)
    }
  }

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <main className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{"Mail Inbox"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {"Inbound email lands here first. Sync pulls unread mailbox messages, marks them as read, and can match new property inquiries into the CRM automatically."}
          </p>
          <div className="mt-5 flex flex-col gap-3 md:flex-row">
            <Input
              className="h-auto border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5"
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Search senders or subjects"
              value={searchTerm}
            />
            <Select
              modal={false}
              onValueChange={(value) => {
                setStatusFilter(!value || value === "all" ? "" : (value as "New" | "Replied" | "Converted"))
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
                <SelectItem value="Replied">
                  {"Replied"}
                </SelectItem>
                <SelectItem value="Converted">
                  {"Converted"}
                </SelectItem>
              </SelectContent>
            </Select>
            <button
              className="inline-flex items-center gap-2 border border-primary bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              onClick={() => setIsComposeOpen(true)}
              type="button"
            >
              <AppIcon name="send" />
              {"Send"}
            </button>
            <label className="inline-flex cursor-pointer items-center gap-2 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-white">
              <AppIcon name="upload_file" />
              {"Import .eml"}
              <input
                accept=".eml,message/rfc822"
                className="sr-only"
                onChange={(event) => void importEml(event.target.files?.[0])}
                type="file"
              />
            </label>
            <Link
              className="inline-flex items-center gap-2 border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 dark:border-white/10 dark:text-white"
              href="/dashboard/lead-collection-templates"
            >
              <AppIcon name="checklist" />
              {"Parsers"}
            </Link>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-slate-950 md:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">{"Mailbox Sync"}</h2>
                <span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${syncStatus?.isConfigured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                  {syncStatus?.isConfigured ? "Mail Connected" : "Mail Not Connected"}
                </span>
                <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-white/10 dark:text-slate-300">
                  {syncStatus?.syncEnabled ? "Mailbox Sync Enabled" : "Mailbox Sync Disabled"}
                </span>
                <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:border-white/10 dark:text-slate-300">
                  {syncStatus?.hasAiProviderConfig ? "AI Ready" : "AI Missing"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {syncStatus?.statusMessage ?? "Loading mailbox sync status..."}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {syncStatus?.syncIntervalMinutes ? <span>{`Every ${syncStatus.syncIntervalMinutes} min`}</span> : null}
                {syncStatus?.lastSucceededAt ? <span>{`Last success ${formatDateTimeLabel(syncStatus.lastSucceededAt)}`}</span> : null}
                {syncStatus?.nextRunAt ? <span>{`Next run ${formatDateTimeLabel(syncStatus.nextRunAt)}`}</span> : null}
                {syncStatus?.isConfigured ? <span>{`Imported ${syncStatus.lastImportedCount}`}</span> : null}
                {syncStatus?.isConfigured ? <span>{`Matched ${syncStatus.lastMatchedLeadCount}`}</span> : null}
                {syncStatus?.isConfigured ? <span>{`Created ${syncStatus.lastCreatedLeadCount}`}</span> : null}
                {syncStatus?.isConfigured ? <span>{`Skipped ${syncStatus.lastSkippedCount}`}</span> : null}
              </div>
              {syncStatus?.lastError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {syncStatus.lastError}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3 xl:justify-end">
              <button
                className="border border-primary bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-70"
                disabled={runSyncMutation.isPending || syncStatus?.isRunning || !syncStatus?.isConfigured || !syncStatus?.syncEnabled}
                onClick={() => void runSyncMutation.mutateAsync()}
                type="button"
              >
                {runSyncMutation.isPending || syncStatus?.isRunning ? "Syncing..." : "Run Sync Now"}
              </button>
              <Link
                className="border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-white/10 dark:text-white"
                href={portalRoutes.settings}
              >
                {"Open Mail Settings"}
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 border-b border-slate-200 bg-background-light px-4 py-4 dark:border-white/10 dark:bg-background-dark sm:grid-cols-3 md:px-6">
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
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"Loading mail inbox..."}</p>
            </article>
          ) : mailInboxQuery.error ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-rose-600">{mailInboxQuery.error.message}</p>
            </article>
          ) : mailInbox.length === 0 ? (
            <article className="border border-slate-200 bg-white p-5 text-center dark:border-white/10 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No mail items match the current filters."}</p>
            </article>
          ) : (
            mailInbox.map((item) => (
              <article
                key={item.id}
                className="cursor-pointer border border-slate-200 bg-white p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02] dark:border-white/10 dark:bg-slate-900"
                onClick={() => openMail(item)}
              >
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">{item.subject}</h2>
                      <span className="border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{item.kind}</span>
                      <span className="border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-white/10 dark:text-slate-300">{item.status}</span>
                      {item.extractionMethod ? (
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {`${item.extractionMethod} ${Math.round((item.extractionConfidence ?? 0) * 100)}%`}
                        </span>
                      ) : null}
                      {item.leadCollectionTemplateName ? (
                        <span className="border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                          {item.leadCollectionTemplateName}
                        </span>
                      ) : null}
                      {item.aiFallbackUsed ? (
                        <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          {"AI fallback"}
                        </span>
                      ) : item.extractionMethod === "Template" ? (
                        <span className="border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                          {"AI skipped"}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 overflow-hidden">
                      <MailRender compact html={item.htmlBody} text={item.message} />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{"Sender"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.email}</p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(item.occurredAt ?? item.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:border-primary hover:text-primary dark:border-white/10 dark:bg-slate-900 dark:text-white"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {"Actions"}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{"Mail actions"}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openMail(item)}>
                          {"Open conversation"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openReply(item)}>
                          {"Reply"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/dashboard/lead-collection-templates/new?mailInboxId=${item.id}`)}>
                          {"Create parser"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {item.leadId ? (
                          <>
                            <DropdownMenuItem onClick={() => router.push(`${portalRoutes.leads}?leadId=${item.leadId}`)}>
                              {"Open lead"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(buildHistoryHref(portalRoutes.leadHistory, item.leadId!))}>
                              {"Open history"}
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem onClick={() => void convertMailInboxToLead.mutateAsync({ mailInboxId: item.id })}>
                            {"Convert to lead"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
        <div className="border-t border-slate-200 px-4 py-4 dark:border-white/10 md:px-6">
          <PagePagination currentPage={page} onPageChange={setPage} totalPages={mailInboxQuery.data?.totalPages ?? 1} />
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="max-w-xl">
            <DialogTitle>{"Send Mail"}</DialogTitle>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"To Email"}</span>
                <Input onChange={(event) => setMailTo(event.target.value)} placeholder="lead@example.com" type="email" value={mailTo} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Subject"}</span>
                <Input onChange={(event) => setMailSubject(event.target.value)} placeholder="Subject" value={mailSubject} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Message"}</span>
                <MiniRichMailEditor className="min-h-40" onChange={setMailMessage} placeholder="Write mail" value={mailMessage} />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Attachments"}</span>
                <Input multiple onChange={(event) => setMailFiles(Array.from(event.target.files ?? []))} type="file" />
                {mailFiles.length ? <span className="text-xs font-semibold text-slate-500">{`${mailFiles.length} file(s) selected`}</span> : null}
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Saved documents"}</span>
                <Input onChange={(event) => setMailDocumentSearch(event.target.value)} placeholder="Search docs by title, category, type" value={mailDocumentSearch} />
                <div className="max-h-44 space-y-2 overflow-auto rounded-lg border p-3">
                  {documents.map((doc) => (
                    <label className="flex items-start gap-2 text-sm" key={doc.id}>
                      <input
                        checked={mailDocumentIds.includes(doc.id)}
                        className="mt-1"
                        onChange={(event) => setMailDocumentIds((current) =>
                          event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id),
                        )}
                        type="checkbox"
                      />
                      <span>
                        <span className="font-semibold">{doc.title}</span>
                        <span className="block text-xs text-slate-500">{`${doc.documentType} - ${doc.category}`}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-700">{"Generated PDF template"}</span>
                <Select modal={false} onValueChange={(value) => setMailPdfTemplateId(value === "none" ? "" : value)} value={mailPdfTemplateId || "none"}>
                  <SelectTrigger><SelectValue placeholder="Choose PDF template" /></SelectTrigger>
                  <SelectContent>
                    <Input className="mb-2 h-8" onChange={(event) => setMailPdfSearch(event.target.value)} placeholder="Search PDF template" value={mailPdfSearch} />
                    <SelectItem value="none">{"No generated PDF"}</SelectItem>
                    {pdfTemplates.map((template) => (
                      <SelectItem key={template.id} value={String(template.id)}>
                        {`${template.name} - ${template.category}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button
                className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={sendMail.isPending || !mailTo.trim() || !mailSubject.trim() || (!htmlToMailText(mailMessage) && mailFiles.length === 0 && mailDocumentIds.length === 0 && !mailPdfTemplateId)}
                onClick={() => void handleSendMail()}
                type="button"
              >
                {sendMail.isPending ? "Sending..." : "Send Mail"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

export function MailInboxDetailPage({ mailId }: { mailId: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const portalRoutes = getPortalRoutes(pathname)
  const mailQuery = useMailInboxItem(mailId)
  const documentsQuery = useDocumentRepository({ page: 1, pageSize: 300 })
  const pdfTemplatesQuery = usePdfTemplates({ page: 1, pageSize: 200, isActive: true })
  const createMailInboxItem = useCreateMailInboxItem()
  const sendMail = useSendMailMessage()
  const updateMailInbox = useUpdateMailInboxItem()
  const [message, setMessage] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [documentSearch, setDocumentSearch] = useState("")
  const [documentIds, setDocumentIds] = useState<number[]>([])
  const [pdfTemplateId, setPdfTemplateId] = useState("")
  const [pdfSearch, setPdfSearch] = useState("")
  const [sentReplies, setSentReplies] = useState<Array<{ body: string; htmlBody?: string; createdAt: string }>>([])

  const mail = mailQuery.data

  useEffect(() => {
    if (!mail || mail.isRead) return
    void updateMailInbox.mutateAsync({ id: mail.id, isRead: true })
  }, [mail, updateMailInbox])
  const allDocuments = documentsQuery.data?.items ?? []
  const documents = useMemo(() => {
    const search = documentSearch.trim().toLowerCase()
    return allDocuments.filter((doc) => !search || `${doc.title} ${doc.category} ${doc.documentType}`.toLowerCase().includes(search))
  }, [allDocuments, documentSearch])
  const pdfTemplates = useMemo(() => {
    const search = pdfSearch.trim().toLowerCase()
    return (pdfTemplatesQuery.data?.items ?? [])
      .filter((template) => template.status !== "Archived")
      .filter((template) => !search || `${template.name} ${template.category}`.toLowerCase().includes(search))
  }, [pdfSearch, pdfTemplatesQuery.data?.items])

  async function sendReply() {
    if (!mail) return
    const uploads = await Promise.all(files.map((file) => uploadPropertyAsset(file, "mail-attachments")))
    const selectedDocUrls = allDocuments
      .filter((doc) => documentIds.includes(doc.id))
      .map((doc) => doc.fileUrl)
      .filter(Boolean)
    const response = await sendMail.mutateAsync({
      attachmentUrls: [...uploads.map((upload) => upload.url), ...selectedDocUrls],
      htmlBody: message,
      message: htmlToMailText(message),
      pdfTemplateId: pdfTemplateId || undefined,
      subject: mail.subject.toLowerCase().startsWith("re:") ? mail.subject : `Re: ${mail.subject}`,
      to: mail.email,
    })
    if (!response.error) {
      setSentReplies((current) => [...current, { body: htmlToMailText(message) || "Attachment sent.", htmlBody: message, createdAt: new Date().toISOString() }])
      setMessage("")
      setFiles([])
      setDocumentIds([])
      setDocumentSearch("")
      setPdfTemplateId("")
      setPdfSearch("")
    }
  }

  async function importEml(file?: File | null) {
    if (!file) return
    const payload = await parseEmlFile(file)
    const result = await createMailInboxItem.mutateAsync(payload)
    if (!result.error && result.data) {
      setSentReplies([])
      router.push(`/dashboard/mail/${result.data.id}`)
    }
  }

  return (
    <main className="min-h-screen bg-background-light text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-slate-950 md:px-6">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-primary" href="/dashboard/mail">
          <AppIcon name="arrow_back" />
          {"Back to inbox"}
        </Link>
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{"Mail conversation"}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{mail?.subject ?? "Loading mail..."}</h1>
            {mail ? <p className="mt-2 text-sm text-slate-500">{`${mail.name} <${mail.email}>`}</p> : null}
          </div>
          {mail ? (
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700">
                {"Import .eml"}
                <input
                  accept=".eml,message/rfc822"
                  className="sr-only"
                  onChange={(event) => void importEml(event.target.files?.[0])}
                  type="file"
                />
              </label>
              <Link className="border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={`/dashboard/lead-collection-templates/new?mailInboxId=${mail.id}`}>
                {"Create parser"}
              </Link>
              {mail.leadId ? (
                <>
                  <Link className="border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={`${portalRoutes.leads}?leadId=${mail.leadId}`}>{"Open lead"}</Link>
                  <Link className="border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={buildHistoryHref(portalRoutes.leadHistory, mail.leadId)}>{"Open history"}</Link>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-5 px-4 py-6 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          {mailQuery.isLoading ? (
            <p className="text-sm font-semibold text-slate-500">{"Loading mail..."}</p>
          ) : mailQuery.error ? (
            <p className="text-sm font-semibold text-rose-600">{mailQuery.error.message}</p>
          ) : mail ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-4">
                <div className="mb-4 flex gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                    {(mail.name || mail.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{mail.name || mail.email}</p>
                        <p className="text-sm text-slate-500">{`to me - ${mail.status}`}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTimeLabel(mail.occurredAt ?? mail.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <MailRender html={mail.htmlBody} text={mail.message} />
              </div>
              {sentReplies.map((reply) => (
                <div className="rounded-2xl border border-slate-200 bg-white p-4" key={reply.createdAt}>
                  <div className="mb-4 flex gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{"Y"}</div>
                    <div>
                      <p className="font-bold text-slate-900">{"You"}</p>
                      <p className="text-xs text-slate-500">{formatDateTimeLabel(reply.createdAt)}</p>
                    </div>
                  </div>
                  <div className="pl-[52px]">
                    <MailRender compact html={reply.htmlBody} text={reply.body} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-500">{"Mail not found."}</p>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">{"Y"}</div>
            <div>
              <h2 className="text-lg font-black">{"Reply"}</h2>
              <p className="text-sm text-slate-500">{mail ? `to ${mail.email}` : "Loading recipient..."}</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <MiniRichMailEditor className="min-h-36" onChange={setMessage} placeholder="Write reply..." value={message} />
            <Input className="rounded-xl border-slate-200" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />
            {files.length ? <p className="text-xs font-semibold text-slate-500">{`${files.length} file(s) selected`}</p> : null}
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700">{"Saved documents"}</p>
              <Input onChange={(event) => setDocumentSearch(event.target.value)} placeholder="Search docs" value={documentSearch} />
              <div className="max-h-40 space-y-2 overflow-auto rounded-xl border p-3">
                {documents.map((doc) => (
                  <label className="flex items-start gap-2 text-sm" key={doc.id}>
                    <input checked={documentIds.includes(doc.id)} className="mt-1" onChange={(event) => setDocumentIds((current) => event.target.checked ? [...current, doc.id] : current.filter((id) => id !== doc.id))} type="checkbox" />
                    <span><span className="font-semibold">{doc.title}</span><span className="block text-xs text-slate-500">{`${doc.documentType} - ${doc.category}`}</span></span>
                  </label>
                ))}
              </div>
            </div>
            <Select modal={false} onValueChange={(value) => setPdfTemplateId(value === "none" ? "" : value)} value={pdfTemplateId || "none"}>
              <SelectTrigger><SelectValue placeholder="Generated PDF template" /></SelectTrigger>
              <SelectContent>
                <Input className="mb-2 h-8" onChange={(event) => setPdfSearch(event.target.value)} placeholder="Search PDF template" value={pdfSearch} />
                <SelectItem value="none">{"No generated PDF"}</SelectItem>
                {pdfTemplates.map((template) => <SelectItem key={template.id} value={String(template.id)}>{`${template.name} - ${template.category}`}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              className="rounded-full bg-primary px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={sendMail.isPending || !mail || (!htmlToMailText(message) && files.length === 0 && documentIds.length === 0 && !pdfTemplateId)}
              onClick={() => void sendReply()}
              type="button"
            >
              {sendMail.isPending ? "Sending..." : "Send reply"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}



