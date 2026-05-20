"use client"

import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"

const variableTokens = [
  "{{property_title}}",
  "{{property_address}}",
  "{{showing_date}}",
  "{{showing_end}}",
  "{{showing_time}}",
  "{{recipient_name}}",
  "{{client_name}}",
  "{{broker_name}}",
  "{{broker_email}}",
  "{{broker_phone}}",
  "{{visitor_name}}",
  "{{assigned_agent}}",
  "{{issue_list}}",
]

export type FeedbackTemplateEditorState = {
  id: string
  name: string
  subject: string
  body: string
  followUpSubject: string
  followUpBody: string
  channels: Array<"Email" | "SMS" | "WhatsApp">
}

export function makeDefaultFeedbackTemplateEditor(): FeedbackTemplateEditorState {
  return {
    id: "",
    name: "",
    subject: "Feedback request for {{property_title}}",
    body: "Hi {{broker_name}}, please share feedback for {{property_title}} after {{showing_date}}.",
    followUpSubject: "Follow-up on {{property_title}} feedback",
    followUpBody: "Hi {{broker_name}}, quick follow-up for {{property_title}}. Please send your feedback when ready.",
    channels: ["Email", "SMS"],
  }
}

export function TemplatesTab({
  deletePending,
  editor,
  onChange,
  onDelete,
  onLoadTemplate,
  onNew,
  onSave,
  savePending,
  templates,
}: {
  deletePending: boolean
  editor: FeedbackTemplateEditorState
  onChange: (updater: (current: FeedbackTemplateEditorState) => FeedbackTemplateEditorState) => void
  onDelete: () => Promise<void>
  onLoadTemplate: (template: AgencyCommunicationTemplateItem) => void
  onNew: () => void
  onSave: () => Promise<void>
  savePending: boolean
  templates: AgencyCommunicationTemplateItem[]
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.5fr)]">
      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] p-6 shadow-sm">
        <div className="space-y-2 border-b border-slate-200 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1b5e8a]/75">{"Reusable content"}</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-[2rem]">{"Template Vault"}</h2>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            {"Save broker request text once, reuse it later in manual send or campaign studio. Variables below work in both first message and follow-up."}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-900" onClick={onNew} type="button">
            {"New"}
          </button>
          <button className="rounded-full bg-[#1b5e8a] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white disabled:opacity-60" disabled={savePending} onClick={() => void onSave()} type="button">
            {savePending ? "Saving..." : "Save"}
          </button>
          <button className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-rose-700 disabled:opacity-60" disabled={deletePending || !editor.id} onClick={() => void onDelete()} type="button">
            {deletePending ? "Deleting..." : "Delete"}
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Template name">
            <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} value={editor.name} />
          </Field>
          <Field label="First subject">
            <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, subject: event.target.value }))} value={editor.subject} />
          </Field>
          <Field label="First message">
            <Textarea className="min-h-36 rounded-[1.6rem]" onChange={(event) => onChange((current) => ({ ...current, body: event.target.value }))} value={editor.body} />
          </Field>
          <Field label="Follow-up subject">
            <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, followUpSubject: event.target.value }))} value={editor.followUpSubject} />
          </Field>
          <Field label="Follow-up message">
            <Textarea className="min-h-36 rounded-[1.6rem]" onChange={(event) => onChange((current) => ({ ...current, followUpBody: event.target.value }))} value={editor.followUpBody} />
          </Field>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Channels"}</p>
            <div className="flex flex-wrap gap-2">
              {(["Email", "SMS", "WhatsApp"] as const).map((channel) => {
                const active = editor.channels.includes(channel)
                return (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                    key={channel}
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        channels: active
                          ? current.channels.filter((item) => item !== channel)
                          : [...current.channels, channel],
                      }))
                    }
                    type="button"
                  >
                    {channel}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="space-y-3 rounded-[1.6rem] border border-slate-200 bg-[#f7f5f1]/75 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Available variables"}</p>
            <div className="flex flex-wrap gap-2">
              {variableTokens.map((token) => (
                <Badge className="rounded-full bg-[#1b5e8a]/10 px-3 py-1 text-[#1b5e8a]" key={token} variant="secondary">
                  {token}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] p-6 shadow-sm">
        <div className="space-y-2 border-b border-slate-200 pb-5">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">{"Saved Templates"}</h2>
          <p className="text-sm leading-7 text-slate-500">{"Pick any template to load both first message and follow-up copy."}</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {templates.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">{"No feedback template yet."}</p>
          ) : (
            templates.map((template) => (
              <button
                className="rounded-[1.6rem] border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#1b5e8a]/35 hover:bg-[#1b5e8a]/5"
                key={template.id}
                onClick={() => onLoadTemplate(template)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900">{template.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{template.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.channels.map((channel) => (
                      <Badge className="rounded-full bg-[#1b5e8a]/10 px-2 py-1 text-[#1b5e8a]" key={`${template.id}-${channel}`} variant="secondary">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>
                {template.subject ? <p className="mt-3 text-sm font-semibold text-slate-900">{template.subject}</p> : null}
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-500">{template.body}</p>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</span>
      {children}
    </label>
  )
}
