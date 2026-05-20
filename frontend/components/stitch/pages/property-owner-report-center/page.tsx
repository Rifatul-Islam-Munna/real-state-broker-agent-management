"use client"

import { useMemo, useState } from "react"
import { usePathname } from "next/navigation"

import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  useDeleteLeadOutreachTemplate,
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
  const templatesQuery = useLeadOutreachTemplates()
  const sendMutation = useSendPropertyOwnerReports()
  const saveTemplateMutation = useSaveLeadOutreachTemplate()
  const deleteTemplateMutation = useDeleteLeadOutreachTemplate()
  const data = reportsQuery.data
  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((item) => item.id.startsWith("owner-report-") || item.name.toLowerCase().includes("owner report")),
    [templatesQuery.data],
  )
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([])
  const [templateId, setTemplateId] = useState("")
  const [templateName, setTemplateName] = useState("Owner Report Template")
  const [subject, setSubject] = useState("Owner update for {{property_title}}")
  const [body, setBody] = useState("Hello {{owner_name}}, here is your {{report_frequency}} report for {{property_title}}.\n\n{{feedback_summary}}\n\n{{issue_list}}\n\n{{recommendation_summary}}")
  const [channels, setChannels] = useState<Array<"Email" | "SMS">>(["Email"])

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
                    variableTokens: ["{{owner_name}}", "{{property_title}}", "{{report_frequency}}", "{{feedback_summary}}", "{{issue_list}}", "{{recommendation_summary}}"],
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
              <button
                className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
                disabled={sendMutation.isPending}
                onClick={() => {
                  void sendMutation.mutateAsync({
                    propertyIds: selectedPropertyIds,
                    channels,
                    subject,
                    body,
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

        <ReportSummaryGrid
          isSending={sendMutation.isPending}
          items={data?.summaries ?? []}
          onSend={(propertyId) => {
            void sendMutation.mutateAsync({
              propertyId: propertyId ?? null,
              channels,
              subject,
              body,
              createdBy,
            })
          }}
        />

        <DispatchHistory items={data?.dispatches ?? []} />
      </div>
    </main>
  )
}
