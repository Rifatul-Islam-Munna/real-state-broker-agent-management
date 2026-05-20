"use client"

import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import type {
  AgencyCommunicationChannel,
  AgencyCommunicationTemplateItem,
  LeadItem,
  PropertyItem,
  ShowingBookingItem,
} from "@/@types/real-estate-api"

import { autoMap, parseCsv } from "./utils"

type CampaignAudienceType = "showings" | "propertyVisits" | "csv"

const csvEmpty = "__empty__"
const csvMappingStorageKey = "property-feedback-campaign-csv-mapping"
const csvAliases = {
  propertyTitle: ["property", "property title", "listing"],
  propertyId: ["property id", "listing id"],
  recipientName: ["broker", "broker name", "recipient name", "name", "showing agent"],
  recipientEmail: ["broker email", "recipient email", "email", "showing agent email"],
  recipientPhone: ["broker phone", "recipient phone", "phone", "showing agent phone"],
  showingDate: ["showing date", "showing time", "date", "start at"],
  leadName: ["lead name", "visitor", "client", "contact name"],
} satisfies Record<string, string[]>

const csvFields = [
  ["propertyTitle", "Property title"],
  ["propertyId", "Property id"],
  ["recipientName", "Broker / recipient name"],
  ["recipientEmail", "Broker / recipient email"],
  ["recipientPhone", "Broker / recipient phone"],
  ["showingDate", "Showing date/time"],
  ["leadName", "Property visit / lead name"],
] as const

const csvFieldLabelMap = new Map<string, string>(csvFields.map(([value, label]) => [value, label]))

export type FeedbackCampaignState = {
  propertyId: number
  audienceType: CampaignAudienceType
  templateId: string
  templateName: string
  subject: string
  message: string
  followUpSubject: string
  followUpMessage: string
  channels: AgencyCommunicationChannel[]
  scheduledAt: string
  selectedShowingIds: number[]
  selectedLeadIds: number[]
  csvBatchName: string
  csvHeaders: string[]
  csvRows: Array<Record<string, string>>
  csvMappings: Record<string, string>
}

export function makeDefaultFeedbackCampaign(): FeedbackCampaignState {
  return {
    propertyId: 0,
    audienceType: "propertyVisits",
    templateId: "",
    templateName: "Custom template",
    subject: "Feedback request for {{property_title}}",
    message: "Hi {{broker_name}}, please share feedback for {{property_title}} after {{showing_date}}.",
    followUpSubject: "Follow-up on {{property_title}} feedback",
    followUpMessage: "Hi {{broker_name}}, quick follow-up for {{property_title}}. Please send your feedback when ready.",
    channels: ["Email", "SMS"],
    scheduledAt: "",
    selectedShowingIds: [],
    selectedLeadIds: [],
    csvBatchName: "",
    csvHeaders: [],
    csvRows: [],
    csvMappings: {},
  }
}

export function CampaignTab({
  campaign,
  isSending,
  leads,
  onChange,
  onSend,
  properties,
  showings,
  templates,
}: {
  campaign: FeedbackCampaignState
  isSending: boolean
  leads: LeadItem[]
  onChange: (updater: (current: FeedbackCampaignState) => FeedbackCampaignState) => void
  onSend: () => Promise<void>
  properties: PropertyItem[]
  showings: ShowingBookingItem[]
  templates: AgencyCommunicationTemplateItem[]
}) {
  const [mappingPresetName, setMappingPresetName] = useState("Default campaign mapping")
  const feedbackTemplates = useMemo(
    () =>
      templates.filter(
        (item) =>
          item.id.startsWith("feedback-request-") ||
          item.name.toLowerCase().includes("feedback request") ||
          item.name.toLowerCase().includes("showing feedback"),
      ),
    [templates],
  )
  const visibleShowings = useMemo(
    () => showings.filter((item) => !campaign.propertyId || item.propertyId === campaign.propertyId),
    [campaign.propertyId, showings],
  )
  const propertyVisitLeads = useMemo(
    () =>
      leads.filter((item) => {
        if (campaign.propertyId) {
          const property = properties.find((entry) => entry.id === campaign.propertyId)
          if (property && item.property !== property.title) {
            return false
          }
        }

        return item.inBoard && item.stage === "Visit"
      }),
    [campaign.propertyId, leads, properties],
  )

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const saved = window.localStorage.getItem(csvMappingStorageKey)
    if (!saved) {
      return
    }

    try {
      const parsed = JSON.parse(saved) as { mappings?: Record<string, string>; name?: string }
      if (parsed.name) {
        setMappingPresetName(parsed.name)
      }
      if (parsed.mappings && Object.keys(campaign.csvMappings).length === 0) {
        onChange((current) => ({ ...current, csvMappings: parsed.mappings ?? current.csvMappings }))
      }
    } catch {
    }
  }, [campaign.csvMappings, onChange])

  function loadTemplate(templateId: string) {
    const template = feedbackTemplates.find((item) => item.id === templateId) ?? null
    onChange((current) => ({
      ...current,
      templateId,
      templateName: template?.name ?? "Custom template",
      subject: template?.subject ?? current.subject,
      message: template?.body ?? current.message,
      followUpSubject: template?.followUpSubject || template?.subject || current.followUpSubject,
      followUpMessage: template?.followUpBody || template?.body || current.followUpMessage,
      channels: template?.channels?.length ? template.channels.filter((item) => item !== "WhatsApp") : current.channels,
    }))
  }

  function toggleShowing(showingId: number) {
    onChange((current) => ({
      ...current,
      selectedShowingIds: current.selectedShowingIds.includes(showingId)
        ? current.selectedShowingIds.filter((item) => item !== showingId)
        : [...current.selectedShowingIds, showingId],
    }))
  }

  function toggleLead(leadId: number) {
    onChange((current) => ({
      ...current,
      selectedLeadIds: current.selectedLeadIds.includes(leadId)
        ? current.selectedLeadIds.filter((item) => item !== leadId)
        : [...current.selectedLeadIds, leadId],
    }))
  }

  function toggleChannel(channel: AgencyCommunicationChannel) {
    onChange((current) => {
      const next = current.channels.includes(channel)
        ? current.channels.filter((item) => item !== channel)
        : [...current.channels, channel]
      return { ...current, channels: next.length > 0 ? next : ["Email"] }
    })
  }

  function handleCsvUpload(file: File) {
    file.text().then((text) => {
      const parsed = parseCsv(text)
      onChange((current) => ({
        ...current,
        csvBatchName: file.name.replace(/\.[^/.]+$/, ""),
        csvHeaders: parsed.headers,
        csvRows: parsed.rows,
        csvMappings: autoMap(parsed.headers, csvAliases),
      }))
    })
  }

  function saveCsvMapping() {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(
      csvMappingStorageKey,
      JSON.stringify({
        name: mappingPresetName.trim() || "Default campaign mapping",
        mappings: campaign.csvMappings,
      }),
    )
  }

  function loadCsvMapping() {
    if (typeof window === "undefined") {
      return
    }

    const saved = window.localStorage.getItem(csvMappingStorageKey)
    if (!saved) {
      return
    }

    try {
      const parsed = JSON.parse(saved) as { mappings?: Record<string, string>; name?: string }
      setMappingPresetName(parsed.name || "Default campaign mapping")
      onChange((current) => ({ ...current, csvMappings: parsed.mappings ?? current.csvMappings }))
    } catch {
    }
  }

  const selectedCount =
    campaign.audienceType === "showings"
      ? campaign.selectedShowingIds.length
      : campaign.audienceType === "propertyVisits"
        ? campaign.selectedLeadIds.length
        : campaign.csvRows.length

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2 border-b border-slate-200 pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#1b5e8a]/75">{"Bulk broker send"}</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 md:text-[2rem]">{"Campaign Studio"}</h2>
          <p className="text-sm leading-7 text-slate-500">
            {"Send from property visit board, showing table, or direct CSV. Batch broker feedback request stays tied to property."}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Send source"}</span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "propertyVisits", label: "Property Visit Board" },
                { value: "showings", label: "Showing Table" },
                { value: "csv", label: "Direct CSV" },
              ].map((option) => {
                const active = campaign.audienceType === option.value
                return (
                  <button
                    className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                    key={option.value}
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        audienceType: option.value as CampaignAudienceType,
                      }))
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {campaign.audienceType !== "csv" ? (
            <label className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {campaign.audienceType === "propertyVisits" ? "Property Visit filter" : "Showing table filter"}
              </span>
              <select
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm"
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    propertyId: Number(event.target.value) || 0,
                    selectedShowingIds: current.selectedShowingIds.filter((id) => {
                      const showing = showings.find((item) => item.id === id)
                      return showing ? !event.target.value || showing.propertyId === Number(event.target.value) : false
                    }),
                    selectedLeadIds: current.selectedLeadIds.filter((id) => {
                      const lead = leads.find((item) => item.id === id)
                      const property = properties.find((item) => item.id === Number(event.target.value))
                      return !event.target.value || !property || lead?.property === property.title
                    }),
                  }))
                }
                value={campaign.propertyId ? String(campaign.propertyId) : ""}
              >
                <option value="">
                  {campaign.audienceType === "propertyVisits" ? "All property visits" : "All showing records"}
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{property.title}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-[#f7f5f1]/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Direct CSV mode"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {"CSV mode does not use property filter here. Property match comes from your CSV mapping rows."}
              </p>
            </div>
          )}

          <label className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Template"}</span>
            <select className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm" onChange={(event) => loadTemplate(event.target.value)} value={campaign.templateId}>
              <option value="">{"Custom draft"}</option>
              {feedbackTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"First subject"}</span>
            <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, subject: event.target.value }))} value={campaign.subject} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"First message"}</span>
            <Textarea className="min-h-32 rounded-[1.6rem]" onChange={(event) => onChange((current) => ({ ...current, message: event.target.value }))} value={campaign.message} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Follow-up subject"}</span>
            <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, followUpSubject: event.target.value }))} value={campaign.followUpSubject} />
          </label>
          <label className="flex flex-col gap-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Follow-up message"}</span>
            <Textarea className="min-h-32 rounded-[1.6rem]" onChange={(event) => onChange((current) => ({ ...current, followUpMessage: event.target.value }))} value={campaign.followUpMessage} />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Scheduled time"}</span>
              <Input className="rounded-2xl" onChange={(event) => onChange((current) => ({ ...current, scheduledAt: event.target.value }))} type="datetime-local" value={campaign.scheduledAt} />
            </label>
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{"Channels"}</span>
              <div className="flex flex-wrap gap-2">
                {(["Email", "SMS"] as const).map((channel) => {
                  const active = campaign.channels.includes(channel)
                  return (
                    <button
                      className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-700"}`}
                      key={channel}
                      onClick={() => toggleChannel(channel)}
                      type="button"
                    >
                      {channel}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button className="rounded-full bg-[#1b5e8a] px-5 py-3 text-sm font-bold text-white disabled:opacity-60" disabled={isSending || selectedCount === 0} onClick={() => void onSend()} type="button">
            {isSending ? "Scheduling..." : `Send to ${selectedCount} records`}
          </button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {campaign.audienceType === "showings" ? (
          <>
            <div className="space-y-2 border-b border-slate-200 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{"Showing time table"}</h2>
              <p className="text-sm leading-7 text-slate-500">{`Choose one, many, or all brokers from existing showings. ${visibleShowings.length} showing records found.`}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => onChange((current) => ({ ...current, selectedShowingIds: visibleShowings.map((item) => item.id) }))} type="button">
                {"Select all"}
              </button>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => onChange((current) => ({ ...current, selectedShowingIds: [] }))} type="button">
                {"Clear"}
              </button>
              <Badge className="rounded-full bg-[#c18b2f]/10 px-3 py-2 text-[#8b6722]" variant="secondary">
                {`${campaign.selectedShowingIds.length} selected`}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {visibleShowings.map((showing) => {
                const active = campaign.selectedShowingIds.includes(showing.id)
                return (
                  <button
                    className={`w-full rounded-[1.35rem] border p-4 text-left ${active ? "border-[#1b5e8a] bg-[#1b5e8a]/5" : "border-slate-200 bg-[#f7f5f1]/55"}`}
                    key={showing.id}
                    onClick={() => toggleShowing(showing.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{showing.propertyTitle}</p>
                        <p className="mt-1 text-sm text-slate-600">{showing.showingAgentName || showing.contactName || "No broker name"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                          {`${showing.showingAgentEmail || showing.contactEmail || "No email"} | ${showing.showingAgentPhone || showing.contactPhone || "No phone"}`}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700" variant="secondary">
                        {new Date(showing.startAt).toLocaleString()}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {campaign.audienceType === "propertyVisits" ? (
          <>
            <div className="space-y-2 border-b border-slate-200 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{"Property Visit board"}</h2>
              <p className="text-sm leading-7 text-slate-500">{`Send broker feedback request from leads already sitting in Property Visit flow. ${propertyVisitLeads.length} visit records found.`}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => onChange((current) => ({ ...current, selectedLeadIds: propertyVisitLeads.map((item) => item.id) }))} type="button">
                {"Select all"}
              </button>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={() => onChange((current) => ({ ...current, selectedLeadIds: [] }))} type="button">
                {"Clear"}
              </button>
              <Badge className="rounded-full bg-[#c18b2f]/10 px-3 py-2 text-[#8b6722]" variant="secondary">
                {`${campaign.selectedLeadIds.length} selected`}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {propertyVisitLeads.map((lead) => {
                const active = campaign.selectedLeadIds.includes(lead.id)
                return (
                  <button
                    className={`w-full rounded-[1.35rem] border p-4 text-left ${active ? "border-[#1b5e8a] bg-[#1b5e8a]/5" : "border-slate-200 bg-[#f7f5f1]/55"}`}
                    key={lead.id}
                    onClick={() => toggleLead(lead.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{lead.property || "No property"}</p>
                        <p className="mt-1 text-sm text-slate-600">{lead.showingAgentName || lead.name || "No broker name"}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                          {`${lead.showingAgentEmail || lead.email || "No email"} | ${lead.showingAgentPhone || lead.phone || "No phone"}`}
                        </p>
                      </div>
                      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700" variant="secondary">
                        {lead.stage}
                      </Badge>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : null}

        {campaign.audienceType === "csv" ? (
          <>
            <div className="space-y-2 border-b border-slate-200 pb-5">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">{"Direct CSV batch"}</h2>
              <p className="text-sm leading-7 text-slate-500">{`Upload broker rows, map columns by hand, save mapping, then batch send without needing lead first. ${campaign.csvRows.length} CSV rows loaded.`}</p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <label className="rounded-full border border-dashed border-slate-300 bg-[#f7f5f1] px-4 py-2 text-sm font-semibold text-slate-700">
                <input
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      handleCsvUpload(file)
                    }
                  }}
                  type="file"
                />
                {"Upload CSV"}
              </label>
              <Input className="max-w-[260px] rounded-2xl" onChange={(event) => setMappingPresetName(event.target.value)} placeholder="Mapping preset name" value={mappingPresetName} />
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={saveCsvMapping} type="button">
                {"Save mapping"}
              </button>
              <button className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700" onClick={loadCsvMapping} type="button">
                {"Load mapping"}
              </button>
              <Badge className="rounded-full bg-[#c18b2f]/10 px-3 py-2 text-[#8b6722]" variant="secondary">
                {`${campaign.csvRows.length} rows loaded`}
              </Badge>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {csvFields.map(([key, label]) => (
                <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500" key={key}>
                  <span>{label}</span>
                  <Select onValueChange={(value) => onChange((current) => ({ ...current, csvMappings: { ...current.csvMappings, [key]: value === csvEmpty ? "" : value } }))} value={campaign.csvMappings[key] || csvEmpty}>
                    <SelectTrigger>
                      <SelectValue>{campaign.csvMappings[key] || csvFieldLabelMap.get(key) || "Skip column"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={csvEmpty}>{"Skip column"}</SelectItem>
                      {campaign.csvHeaders.map((header) => (
                        <SelectItem key={`${key}-${header}`} value={header}>{header}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              ))}
            </div>

            {campaign.csvRows.length > 0 ? (
              <div className="mt-5 overflow-x-auto rounded-[1.25rem] border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f7f5f1] text-slate-500">
                    <tr>
                      {campaign.csvHeaders.map((header) => (
                        <th className="px-4 py-3 font-bold" key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaign.csvRows.slice(0, 5).map((row, index) => (
                      <tr className="border-t border-slate-200" key={`campaign-row-${index}`}>
                        {campaign.csvHeaders.map((header) => (
                          <td className="px-4 py-3 text-slate-700" key={`campaign-row-${index}-${header}`}>
                            {row[header]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  )
}
