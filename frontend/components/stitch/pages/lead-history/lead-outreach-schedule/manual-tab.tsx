import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import type { LeadItem } from "@/@types/real-estate-api"
import { dealStageOrder, formatDealStage, formatLeadStage, leadStageOrder } from "@/lib/admin-portal"

import type { FeedbackState, MessageStudioState, OutreachKind } from "./types"
import { FeedbackBox, Field, SectionIntro } from "./utils"

const audienceOptions = [
  { value: "SingleLead", label: "Single lead" },
  { value: "LeadStage", label: "Lead stage" },
  { value: "DealStage", label: "Deal stage" },
] as const

export function ManualTab({
  bulkPending,
  dispatchPending,
  deals,
  leads,
  leadStageCount,
  messageError,
  messageFeedback,
  messageStudio,
  onMessageChange,
  onSubmit,
  selectedLead,
}: {
  bulkPending: boolean
  deals: { totalCount?: number } | undefined
  dispatchPending: boolean
  leads: LeadItem[]
  leadStageCount: { totalCount?: number } | undefined
  messageError: string | null
  messageFeedback: FeedbackState | null
  messageStudio: MessageStudioState
  onMessageChange: (updater: (current: MessageStudioState) => MessageStudioState) => void
  onSubmit: () => Promise<void>
  selectedLead: LeadItem | null
}) {
  const previewText =
    messageStudio.audienceType === "SingleLead"
      ? selectedLead
        ? `${selectedLead.name} | ${selectedLead.email || selectedLead.phone || "No contact"}`
        : "No lead chosen yet."
      : messageStudio.audienceType === "LeadStage"
        ? `${leadStageCount?.totalCount ?? 0} leads in ${messageStudio.leadStage ? formatLeadStage(messageStudio.leadStage) : "selected stage"}`
        : `${deals?.totalCount ?? 0} deals in ${messageStudio.dealStage ? formatDealStage(messageStudio.dealStage) : "selected stage"}`

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
        <CardHeader className="border-b border-border">
          <SectionIntro
            eyebrow="Direct scheduling"
            helper="Best for one lead, one lead stage, or one deal stage."
            title="Manual Schedule"
          />
        </CardHeader>

        <CardContent className="space-y-5 py-6">
          <Field label="Audience">
            <div className="grid gap-2 md:grid-cols-3">
              {audienceOptions.map((option) => {
                const active = messageStudio.audienceType === option.value

                return (
                  <button
                    className={`rounded-2xl border px-3 py-3 text-sm font-bold transition ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                    }`}
                    key={option.value}
                    onClick={() => onMessageChange((current) => ({ ...current, audienceType: option.value }))}
                    type="button"
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {messageStudio.audienceType === "SingleLead" ? (
            <Field label="Lead">
              <select
                className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                onChange={(event) => onMessageChange((current) => ({ ...current, leadId: event.target.value }))}
                value={messageStudio.leadId}
              >
                <option value="">{"Choose lead"}</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {`${lead.name || `Lead #${lead.id}`} - ${lead.email || lead.phone || "No contact"}`}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {messageStudio.audienceType === "LeadStage" ? (
            <Field label="Lead stage">
              <select
                className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                onChange={(event) => onMessageChange((current) => ({ ...current, leadStage: event.target.value as MessageStudioState["leadStage"] }))}
                value={messageStudio.leadStage}
              >
                <option value="">{"Choose stage"}</option>
                {leadStageOrder.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatLeadStage(stage)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {messageStudio.audienceType === "DealStage" ? (
            <Field label="Deal stage">
              <select
                className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                onChange={(event) => onMessageChange((current) => ({ ...current, dealStage: event.target.value as MessageStudioState["dealStage"] }))}
                value={messageStudio.dealStage}
              >
                <option value="">{"Choose stage"}</option>
                {dealStageOrder.map((stage) => (
                  <option key={stage} value={stage}>
                    {formatDealStage(stage)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Channel">
              <select
                className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                onChange={(event) => onMessageChange((current) => ({ ...current, kind: event.target.value as OutreachKind }))}
                value={messageStudio.kind}
              >
                <option value="Email">{"Email"}</option>
                <option value="Sms">{"SMS"}</option>
                <option value="Call">{"Call"}</option>
              </select>
            </Field>
            <Field label="Send time">
              <Input
                className="rounded-2xl"
                onChange={(event) => onMessageChange((current) => ({ ...current, scheduledAt: event.target.value }))}
                type="datetime-local"
                value={messageStudio.scheduledAt}
              />
            </Field>
          </div>

          {messageStudio.kind !== "Sms" ? (
            <Field label={messageStudio.kind === "Email" ? "Email subject" : "Call title"}>
              <Input
                className="rounded-2xl"
                onChange={(event) => onMessageChange((current) => ({ ...current, title: event.target.value }))}
                value={messageStudio.title}
              />
            </Field>
          ) : null}

          <Field label="Message body">
            <Textarea
              className="min-h-40 rounded-[1.6rem] bg-background"
              onChange={(event) => onMessageChange((current) => ({ ...current, message: event.target.value }))}
              value={messageStudio.message}
            />
          </Field>

          <FeedbackBox error={messageError} feedback={messageFeedback} />

          <button
            className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
            disabled={dispatchPending || bulkPending}
            onClick={() => void onSubmit()}
            type="button"
          >
            {dispatchPending || bulkPending ? "Saving..." : "Save Schedule"}
          </button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">{"Audience Preview"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">{previewText}</CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">{"Note"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-muted-foreground">
            {"Manual schedule handles one channel at time. Campaign Studio handles multi-channel Email + SMS flows."}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
