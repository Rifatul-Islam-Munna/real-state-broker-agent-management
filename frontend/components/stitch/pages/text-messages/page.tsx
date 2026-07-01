"use client"

import { useMemo, useState } from "react"

import { PagePagination } from "@/components/stitch/shared/page-pagination"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSendSmsMessage, useSmsMessages, useSyncSmsMessages } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import { uploadPropertyAsset } from "@/lib/upload-client"

const PAGE_SIZE = 12

export function TextMessagesPage() {
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
                <article key={message.id} className="border border-slate-200 bg-white p-5">
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
