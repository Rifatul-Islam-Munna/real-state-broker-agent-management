"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSendSmsMessage, useSmsMessageItem, useSmsMessages, useSyncSmsMessages, type SmsMessageItem } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { uploadPropertyAsset } from "@/lib/upload-client"

const PAGE_SIZE = 12

export function TextMessagesPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [to, setTo] = useState("")
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])

  const smsQuery = useSmsMessages({
    page,
    pageSize: PAGE_SIZE,
    search: searchTerm || undefined,
  })
  const sendSms = useSendSmsMessage()
  const syncSms = useSyncSmsMessages()

  const messages = useMemo(() => smsQuery.data?.items ?? [], [smsQuery.data?.items])

  async function handleSend() {
    const uploads = await Promise.all(files.map((file) => uploadPropertyAsset(file, "mms-attachments")))
    const response = await sendSms.mutateAsync({
      body: body.trim(),
      mediaUrls: uploads.map((upload) => upload.url),
      to: to.trim(),
    })
    if (!response.error) {
      setBody("")
      setFiles([])
      setIsComposeOpen(false)
      setTo("")
    }
  }

  function openReply(message: SmsMessageItem) {
    setTo(message.direction === "Incoming" ? message.fromNumber : message.toNumber)
    setBody("")
    setFiles([])
    setIsComposeOpen(true)
  }

  return (
    <main className="min-h-screen bg-background-light text-slate-900">
      <section className="border-b border-slate-200 bg-white px-4 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{"Unified SMS Inbox"}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{"Text Messages"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              {"All inbound and outbound SMS lands here no matter if you connect RingCentral, Twilio, Plivo, or send from Lead CRM. RingCentral can poll message-store; Twilio and Plivo sync through provider webhooks."}
            </p>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => setIsComposeOpen(true)}
            type="button"
          >
            <AppIcon name="sms" />
            {"Send SMS / MMS"}
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={syncSms.isPending}
            onClick={() => void syncSms.mutateAsync({})}
            type="button"
          >
            <AppIcon name="sync" />
            {syncSms.isPending ? "Syncing..." : "Sync Now"}
          </button>
        </div>
      </section>

      <section className="px-4 py-6 md:px-6">
        <section className="min-w-0">
          <div className="mb-4">
            <Input
              className="border-slate-200 bg-white"
              onChange={(event) => {
                setSearchTerm(event.target.value)
                setPage(1)
              }}
              placeholder="Search number, lead, or message"
              value={searchTerm}
            />
          </div>

          <div className="flex flex-col gap-3">
            {smsQuery.error ? (
              <div className="border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">{smsQuery.error.message}</div>
            ) : messages.length === 0 ? (
              <div className="border border-slate-200 bg-white p-5 text-center text-sm font-semibold text-slate-500">
                {smsQuery.isLoading ? "Loading messages..." : "No text messages found."}
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className="cursor-pointer border border-slate-200 bg-white p-5 transition-colors hover:border-primary/40 hover:bg-primary/[0.02]"
                  onClick={() => router.push(`/dashboard/text-messages/${message.id}`)}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{message.direction}</span>
                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">{message.status}</span>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{message.provider}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.body}</p>
                      {message.mediaUrls.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.mediaUrls.map((url) => (
                            <a key={url} className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-primary" href={url} rel="noreferrer" target="_blank">
                              {"Open attachment"}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-sm text-slate-500 md:text-right">
                      <p><span className="font-bold text-slate-800">{"From: "}</span>{message.fromNumber || "Unknown"}</p>
                      <p><span className="font-bold text-slate-800">{"To: "}</span>{message.toNumber || "Unknown"}</p>
                      {message.leadName ? <p className="font-bold text-primary">{message.leadName}</p> : null}
                      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{formatDateTimeLabel(message.occurredAt || message.createdAt)}</p>
                      <div className="mt-3 flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:border-primary hover:text-primary"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {"Actions"}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>{"Text actions"}</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/text-messages/${message.id}`)}>
                              {"Open conversation"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openReply(message)}>
                              {"Reply"}
                            </DropdownMenuItem>
                            {message.leadId ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/leads?leadId=${message.leadId}`)}>
                                  {"Open lead"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/dashboard/lead-history?leadId=${message.leadId}`)}>
                                  {"Open history"}
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>

      <div className="border-t border-slate-200 px-4 py-4 md:px-6">
        <PagePagination currentPage={page} onPageChange={setPage} totalPages={smsQuery.data?.totalPages ?? 1} />
      </div>

      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>{"Send SMS / MMS"}</DialogTitle>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"To Number"}</span>
              <Input onChange={(event) => setTo(event.target.value)} placeholder="+1 555 010 2000" value={to} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Message"}</span>
              <Textarea className="min-h-36" onChange={(event) => setBody(event.target.value)} placeholder="Write text or attach files for MMS" value={body} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"MMS Attachments"}</span>
              <Input multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />
              {files.length ? <span className="text-xs font-semibold text-slate-500">{`${files.length} file(s) selected`}</span> : null}
            </label>
            <button
              className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={sendSms.isPending || !to.trim() || (!body.trim() && files.length === 0)}
              onClick={() => void handleSend()}
              type="button"
            >
              {sendSms.isPending ? "Sending..." : files.length ? "Send MMS" : "Send SMS"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}

export function TextMessageDetailPage({ messageId }: { messageId: number }) {
  const messageQuery = useSmsMessageItem(messageId)
  const sendSms = useSendSmsMessage()
  const [body, setBody] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [sentReplies, setSentReplies] = useState<Array<{ body: string; createdAt: string; mediaUrls: string[] }>>([])
  const message = messageQuery.data
  const replyTo = message ? (message.direction === "Incoming" ? message.fromNumber : message.toNumber) : ""

  async function sendReply() {
    if (!message) return
    const uploads = await Promise.all(files.map((file) => uploadPropertyAsset(file, "mms-attachments")))
    const response = await sendSms.mutateAsync({
      body: body.trim(),
      mediaUrls: uploads.map((upload) => upload.url),
      to: replyTo,
    })
    if (!response.error) {
      setSentReplies((current) => [...current, {
        body: body.trim() || "Attachment sent.",
        createdAt: new Date().toISOString(),
        mediaUrls: uploads.map((upload) => upload.url),
      }])
      setBody("")
      setFiles([])
    }
  }

  return (
    <main className="min-h-screen bg-background-light text-slate-900">
      <section className="border-b border-slate-200 bg-white px-4 py-5 md:px-6">
        <Link className="inline-flex items-center gap-2 text-sm font-bold text-primary" href="/dashboard/text-messages">
          <AppIcon name="arrow_back" />
          {"Back to texts"}
        </Link>
        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{"Text conversation"}</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">{replyTo || "Loading message..."}</h1>
            {message ? <p className="mt-2 text-sm text-slate-500">{`${message.fromNumber || "Unknown"} -> ${message.toNumber || "Unknown"}`}</p> : null}
          </div>
          {message?.leadId ? (
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={`/dashboard/leads?leadId=${message.leadId}`}>{"Open lead"}</Link>
              <Link className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700" href={`/dashboard/lead-history?leadId=${message.leadId}`}>{"Open history"}</Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid gap-5 px-4 py-6 md:px-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-h-[60dvh] rounded-2xl border border-slate-200 bg-white p-4">
          {messageQuery.isLoading ? (
            <p className="text-sm font-semibold text-slate-500">{"Loading text..."}</p>
          ) : messageQuery.error ? (
            <p className="text-sm font-semibold text-rose-600">{messageQuery.error.message}</p>
          ) : message ? (
            <div className="space-y-5">
              <div className={`max-w-[82%] rounded-2xl p-4 ${message.direction === "Outgoing" ? "ml-auto rounded-tr-sm bg-primary text-white" : "rounded-tl-sm border border-slate-200 bg-slate-50 text-slate-700"}`}>
                <div className={`mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide ${message.direction === "Outgoing" ? "text-white/70" : "text-slate-400"}`}>
                  <span>{message.direction}</span>
                  <span>{formatDateTimeLabel(message.occurredAt || message.createdAt)}</span>
                  <span>{message.status}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7">{message.body}</p>
                {message.mediaUrls.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.mediaUrls.map((url) => (
                      <a key={url} className="rounded-full border border-current px-3 py-1 text-xs font-bold" href={url} rel="noreferrer" target="_blank">
                        {"Open attachment"}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              {sentReplies.map((reply) => (
                <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-primary p-4 text-white" key={reply.createdAt}>
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-white/70">
                    {`You - ${formatDateTimeLabel(reply.createdAt)}`}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7">{reply.body}</p>
                  {reply.mediaUrls.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reply.mediaUrls.map((url) => (
                        <a key={url} className="rounded-full border border-current px-3 py-1 text-xs font-bold" href={url} rel="noreferrer" target="_blank">
                          {"Open attachment"}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-500">{"Text not found."}</p>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-black">{"Reply"}</h2>
          <p className="mt-1 text-sm text-slate-500">{replyTo || "No recipient yet"}</p>
          <div className="mt-4 space-y-4">
            <Textarea className="min-h-40" onChange={(event) => setBody(event.target.value)} placeholder="Write text..." value={body} />
            <Input multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} type="file" />
            {files.length ? <p className="text-xs font-semibold text-slate-500">{`${files.length} file(s) selected`}</p> : null}
            <button
              className="w-full rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={sendSms.isPending || !message || (!body.trim() && files.length === 0)}
              onClick={() => void sendReply()}
              type="button"
            >
              {sendSms.isPending ? "Sending..." : files.length ? "Send MMS reply" : "Send SMS reply"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}
