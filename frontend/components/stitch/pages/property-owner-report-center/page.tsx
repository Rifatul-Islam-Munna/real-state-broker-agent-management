"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"

import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useDeleteLeadOutreachTemplate,
  useProperties,
  usePropertyOwnerReports,
  useSaveLeadOutreachTemplate,
  useSendPropertyOwnerReports,
} from "@/hooks/use-real-estate-api"

import { DispatchHistory } from "./dispatch-history"
import { ReportSummaryGrid } from "./report-summary-grid"

export function PropertyOwnerReportCenterPage() {
  const pathname = usePathname()
  const createdBy = pathname.startsWith("/agent") ? "Agent" : "Admin"
  const reportsQuery = usePropertyOwnerReports()
  const propertiesQuery = useProperties({ page: 1, pageSize: 300 })
  const templatesQuery = useLeadOutreachTemplates()
  const sendMutation = useSendPropertyOwnerReports()
  const saveTemplateMutation = useSaveLeadOutreachTemplate()
  const deleteTemplateMutation = useDeleteLeadOutreachTemplate()
  const data = reportsQuery.data
  const properties = propertiesQuery.data?.items ?? []
  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((item) => item.id.startsWith("owner-report-") || item.name.toLowerCase().includes("owner report")),
    [templatesQuery.data],
  )
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([])
  const [templateId, setTemplateId] = useState("")
  const [templateName, setTemplateName] = useState("Owner Report Template")
  const [subject, setSubject] = useState("Owner update for {{property_title}}")
  const [body, setBody] = useState("Hello {{owner_name}}, here is your {{report_frequency}} report for {{property_title}}.\n\n{{feedback_summary}}\n\n{{issue_list}}\n\n{{manual_feedback}}\n\n{{custom_hint}}\n\n{{recommendation_summary}}")
  const [channels, setChannels] = useState<Array<"Email" | "SMS">>(["Email"])
  const [manualOwnerName, setManualOwnerName] = useState("")
  const [manualOwnerEmail, setManualOwnerEmail] = useState("")
  const [manualOwnerPhone, setManualOwnerPhone] = useState("")
  const [manualFeedback, setManualFeedback] = useState("")
  const [customHint, setCustomHint] = useState("")
  const [directPropertyId, setDirectPropertyId] = useState<number>(0)
  const [directOwnerName, setDirectOwnerName] = useState("")
  const [directOwnerEmail, setDirectOwnerEmail] = useState("")
  const [directOwnerPhone, setDirectOwnerPhone] = useState("")
  const [directSubject, setDirectSubject] = useState("Manual owner feedback for {{property_title}}")
  const [directBody, setDirectBody] = useState("Hello {{owner_name}},\n\n{{manual_feedback}}\n\n{{custom_hint}}")
  const [directManualFeedback, setDirectManualFeedback] = useState("")
  const [directCustomHint, setDirectCustomHint] = useState("")
  const [directChannels, setDirectChannels] = useState<Array<"Email" | "SMS">>(["Email"])

  function toggleProperty(propertyId: number) {
    setSelectedPropertyIds((current) =>
      current.includes(propertyId) ? current.filter((item) => item !== propertyId) : [...current, propertyId],
    )
  }

  function toggleChannel(channel: "Email" | "SMS") {
    setChannels((current) => {
      const next = current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
      return next.length === 0 ? ["Email"] : next
    })
  }

  function toggleDirectChannel(channel: "Email" | "SMS") {
    setDirectChannels((current) => {
      const next = current.includes(channel) ? current.filter((item) => item !== channel) : [...current, channel]
      return next.length === 0 ? ["Email"] : next
    })
  }

  function loadTemplate(nextTemplateId: string) {
    setTemplateId(nextTemplateId)
    const match = templates.find((item) => item.id === nextTemplateId)
    if (!match) {
      return
    }

    setTemplateName(match.name)
    setSubject(match.subject)
    setBody(match.body)
    setChannels(
      match.channels.filter((item): item is "Email" | "SMS" => item === "Email" || item === "SMS").length > 0
        ? match.channels.filter((item): item is "Email" | "SMS" => item === "Email" || item === "SMS")
        : ["Email"],
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(27,94,138,0.08),transparent_30%),linear-gradient(180deg,#f7f5f1,#f5f3ee)] px-4 py-8 text-slate-900 md:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <section className="rounded-[2rem] border border-[#1b5e8a]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.94))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="max-w-4xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1b5e8a]">{"Owner Report Center"}</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {"Turn visit objections into owner decisions every week or month."}
            </h1>
            <p className="text-sm leading-7 text-slate-600 md:text-[15px]">
              {"This page groups repeated negative feedback by property, shows what owners keep hearing, and lets the team send direct owner updates on demand."}
            </p>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Manual sender"}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{"Save template, pick properties, send now"}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-60"
                disabled={saveTemplateMutation.isPending}
                onClick={() => {
                  void saveTemplateMutation.mutateAsync({
                    id: templateId || `owner-report-${templateName.trim().toLowerCase().replace(/\s+/g, "-")}`,
                    name: templateName,
                    subject,
                    body,
                    channels,
                    variableTokens: ["{{owner_name}}", "{{property_title}}", "{{report_frequency}}", "{{feedback_summary}}", "{{issue_list}}", "{{manual_feedback}}", "{{custom_hint}}", "{{recommendation_summary}}"],
                  })
                }}
                type="button"
              >
                {"Save Template"}
              </button>
              <button
                className="rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-60"
                disabled={!templateId || deleteTemplateMutation.isPending}
                onClick={() => {
                  if (!templateId) return
                  void deleteTemplateMutation.mutateAsync({ id: templateId })
                  setTemplateId("")
                }}
                type="button"
              >
                {"Delete Template"}
              </button>
              <label className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                <input
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setBody(await file.text())
                  }}
                  type="file"
                />
                {"Upload Text"}
              </label>
              <label className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
                <input
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    setManualFeedback(await file.text())
                  }}
                  type="file"
                />
                {"Upload Feedback"}
              </label>
              <button
                className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                disabled={sendMutation.isPending}
                onClick={() => {
                  void sendMutation.mutateAsync({
                    propertyIds: selectedPropertyIds,
                    channels,
                    ownerName: manualOwnerName,
                    ownerEmail: manualOwnerEmail,
                    ownerPhone: manualOwnerPhone,
                    subject,
                    body,
                    manualFeedback,
                    customHint,
                    createdBy,
                  })
                }}
                type="button"
              >
                {"Send Selected"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/70 p-4">
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Saved template"}</span>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                  onChange={(event) => loadTemplate(event.target.value)}
                  value={templateId}
                >
                  <option value="">{"Custom draft"}</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Template name"}</span>
                <Input onChange={(event) => setTemplateName(event.target.value)} value={templateName} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Subject"}</span>
                <Input onChange={(event) => setSubject(event.target.value)} value={subject} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Report body"}</span>
                <Textarea className="min-h-48" onChange={(event) => setBody(event.target.value)} value={body} />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <span>{"Manual owner name"}</span>
                  <Input onChange={(event) => setManualOwnerName(event.target.value)} placeholder="Optional owner override" value={manualOwnerName} />
                </label>
                <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <span>{"Manual owner email"}</span>
                  <Input onChange={(event) => setManualOwnerEmail(event.target.value)} placeholder="Optional owner email" value={manualOwnerEmail} />
                </label>
                <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  <span>{"Manual owner phone"}</span>
                  <Input onChange={(event) => setManualOwnerPhone(event.target.value)} placeholder="Optional owner phone" value={manualOwnerPhone} />
                </label>
              </div>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Manual feedback"}</span>
                <Textarea className="min-h-32" onChange={(event) => setManualFeedback(event.target.value)} placeholder="Paste or type manual feedback you want owner to receive." value={manualFeedback} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Custom hint"}</span>
                <Textarea className="min-h-24" onChange={(event) => setCustomHint(event.target.value)} placeholder="Add your custom advice, pricing note, or next-step hint." value={customHint} />
              </label>
              <div className="flex flex-wrap gap-2">
                {(["Email", "SMS"] as const).map((channel) => (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${channels.includes(channel) ? "border-[#c18b2f] bg-[#c18b2f] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                    key={channel}
                    onClick={() => toggleChannel(channel)}
                    type="button"
                  >
                    {channel}
                  </button>
                ))}
              </div>
              <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-600">
                {"Body supports: {{owner_name}}, {{property_title}}, {{report_frequency}}, {{feedback_summary}}, {{issue_list}}, {{manual_feedback}}, {{custom_hint}}, {{recommendation_summary}}"}
              </div>
            </div>

            <div className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/70 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{"Pick one or many properties"}</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {(data?.summaries ?? []).map((item) => {
                  const active = selectedPropertyIds.includes(item.propertyId)
                  return (
                    <button
                      className={`rounded-[1.2rem] border p-4 text-left ${active ? "border-[#1b5e8a] bg-white" : "border-slate-200 bg-white/70"}`}
                      key={item.propertyId}
                      onClick={() => toggleProperty(item.propertyId)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.propertyTitle}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.ownerName}</p>
                        </div>
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-bold text-rose-700">
                          {item.negativeCount}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{item.topIssues.slice(0, 2).join(", ") || "No issue tags yet"}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Direct sender"}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{"Type and send owner feedback directly"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {"Use this when you do not want summary auto-build only. Type your own feedback, custom hint, and send by email, SMS, or both."}
              </p>
            </div>
            <button
              className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
              disabled={sendMutation.isPending || !directPropertyId || (!directOwnerEmail && !directOwnerPhone) || !directManualFeedback.trim()}
              onClick={() => {
                void sendMutation.mutateAsync({
                  propertyId: directPropertyId,
                  channels: directChannels,
                  ownerName: directOwnerName,
                  ownerEmail: directOwnerEmail,
                  ownerPhone: directOwnerPhone,
                  subject: directSubject,
                  body: directBody,
                  manualFeedback: directManualFeedback,
                  customHint: directCustomHint,
                  createdBy,
                })
              }}
              type="button"
            >
              {"Send Direct"}
            </button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-4 rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/70 p-4">
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Property"}</span>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm"
                  onChange={(event) => setDirectPropertyId(Number(event.target.value) || 0)}
                  value={directPropertyId ? String(directPropertyId) : ""}
                >
                  <option value="">{"Select property"}</option>
                  {properties.map((item) => (
                    <option key={`direct-${item.id}`} value={item.id}>{item.title}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Owner name"}</span>
                <Input onChange={(event) => setDirectOwnerName(event.target.value)} placeholder="Type owner name" value={directOwnerName} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Owner email"}</span>
                <Input onChange={(event) => setDirectOwnerEmail(event.target.value)} placeholder="Type owner email" value={directOwnerEmail} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Owner phone"}</span>
                <Input onChange={(event) => setDirectOwnerPhone(event.target.value)} placeholder="Type owner phone" value={directOwnerPhone} />
              </label>
              <div className="flex flex-wrap gap-2">
                {(["Email", "SMS"] as const).map((channel) => (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${directChannels.includes(channel) ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                    key={`direct-${channel}`}
                    onClick={() => toggleDirectChannel(channel)}
                    type="button"
                  >
                    {channel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/70 p-4">
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Subject"}</span>
                <Input onChange={(event) => setDirectSubject(event.target.value)} value={directSubject} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Message body"}</span>
                <Textarea className="min-h-36" onChange={(event) => setDirectBody(event.target.value)} value={directBody} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Feedback you want to send"}</span>
                <Textarea className="min-h-32" onChange={(event) => setDirectManualFeedback(event.target.value)} placeholder="Type feedback exactly how you want to send it." value={directManualFeedback} />
              </label>
              <label className="block space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>{"Custom hint"}</span>
                <Textarea className="min-h-24" onChange={(event) => setDirectCustomHint(event.target.value)} placeholder="Type your extra owner advice or next step." value={directCustomHint} />
              </label>
            </div>
          </div>
        </section>

        <ReportSummaryGrid
          isSending={sendMutation.isPending}
          items={data?.summaries ?? []}
          onSend={(propertyId) => {
            void sendMutation.mutateAsync({
              propertyId: propertyId ?? null,
              channels,
              ownerName: manualOwnerName,
              ownerEmail: manualOwnerEmail,
              ownerPhone: manualOwnerPhone,
              subject,
              body,
              manualFeedback,
              customHint,
              createdBy,
            })
          }}
        />

        <DispatchHistory items={data?.dispatches ?? []} />
      </div>
    </main>
  )
}
