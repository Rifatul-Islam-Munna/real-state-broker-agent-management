"use client"

import { useEffect, useMemo, useState } from "react"

import { AppIcon } from "@/components/ui/app-icon"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAgencySettings,
  useUpdateAgencySettings,
} from "@/hooks/use-real-estate-api"
import {
  cloneAgencySettings,
  defaultAgencySettings,
  type AgencyWorkspaceSettings,
} from "@/lib/agency-settings"

const feedbackTokenPattern =
  /\{\{(?:feedback_summary|feedback\d+|positive_feedback|negative_feedback|positive_summary|negative_summary)\}\}/

const weekDays = [
  { label: "Sunday", short: "S", value: 0 },
  { label: "Monday", short: "M", value: 1 },
  { label: "Tuesday", short: "T", value: 2 },
  { label: "Wednesday", short: "W", value: 3 },
  { label: "Thursday", short: "T", value: 4 },
  { label: "Friday", short: "F", value: 5 },
  { label: "Saturday", short: "S", value: 6 },
]

function isFollowUpSequence(value?: string) {
  return value === "FollowUp1" || value === "FollowUp2" || value === "FollowUp3"
}

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] ${className}`}
    >
      {children}
    </div>
  )
}

export function ShowingFeedbackAutomationPanel() {
  const query = useAgencySettings()
  const mutation = useUpdateAgencySettings()
  const [values, setValues] = useState<AgencyWorkspaceSettings>(() =>
    cloneAgencySettings(defaultAgencySettings)
  )
  const [error, setError] = useState<string | null>(null)
  const [negativeDraft, setNegativeDraft] = useState("")
  const [positiveDraft, setPositiveDraft] = useState("")

  useEffect(() => {
    if (query.data) setValues(cloneAgencySettings(query.data))
  }, [query.data])

  const automation = values.showingFeedbackAutomation
  const ownerTemplates = useMemo(
    () =>
      values.communicationTemplates.filter(
        (template) =>
          template.audience === "OwnerFeedback" && template.isActive !== false
      ),
    [values.communicationTemplates]
  )
  const followUpTemplates = ownerTemplates.filter(
    (template) => template.id !== automation.templateId
  )
  const selectedFollowUps = followUpTemplates.filter((template) =>
    isFollowUpSequence(template.sequenceType)
  )
  const selectedDay = weekDays.find((day) => day.value === automation.gapDays)
  const negativeExamples = automation.negativeKnowledge
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
  const positiveExamples = automation.positiveKnowledge
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)

  function patch(next: Partial<typeof automation>) {
    setValues((current) => ({
      ...current,
      showingFeedbackAutomation: {
        ...current.showingFeedbackAutomation,
        ...next,
      },
    }))
    setError(null)
  }

  function addExample(kind: "negative" | "positive") {
    const draft = kind === "negative" ? negativeDraft : positiveDraft
    const value = draft.trim()
    if (!value) return

    const current = kind === "negative" ? negativeExamples : positiveExamples
    const next = [...current, value].join("\n")
    patch(kind === "negative" ? { negativeKnowledge: next } : { positiveKnowledge: next })
    if (kind === "negative") setNegativeDraft("")
    else setPositiveDraft("")
  }

  function removeExample(kind: "negative" | "positive", index: number) {
    const current = kind === "negative" ? negativeExamples : positiveExamples
    const next = current.filter((_, itemIndex) => itemIndex !== index).join("\n")
    patch(kind === "negative" ? { negativeKnowledge: next } : { positiveKnowledge: next })
  }

  function toggleChannel(channel: "Email" | "SMS", checked: boolean) {
    const channels = checked
      ? [...new Set([...automation.channels, channel])]
      : automation.channels.filter((item) => item !== channel)
    patch({ channels: channels.length ? channels : [channel] })
  }

  function toggleFollowUp(id: string, checked: boolean) {
    setValues((current) => ({
      ...current,
      communicationTemplates: current.communicationTemplates.map((template) =>
        template.id === id
          ? {
              ...template,
              sequenceType: checked ? "FollowUp1" : "Direct",
            }
          : template
      ),
    }))
    setError(null)
  }

  async function save() {
    setError(null)
    const selectedTemplate = ownerTemplates.find(
      (template) => template.id === automation.templateId
    )
    if (automation.enabled && !selectedTemplate) {
      setError("Choose an active owner feedback template before enabling automation.")
      return
    }

    const selectedSequence = [selectedTemplate, ...selectedFollowUps].filter(Boolean)
    const invalidTemplate = selectedSequence.find(
      (template) =>
        template &&
        !feedbackTokenPattern.test(`${template.subject}\n${template.body}`)
    )
    if (automation.enabled && invalidTemplate) {
      setError(
        `Template “${invalidTemplate.name}” needs a feedback token such as {{positive_feedback}}, {{negative_feedback}}, or {{feedback_summary}}.`
      )
      return
    }
    if (automation.enabled && automation.channels.length === 0) {
      setError("Choose Email, SMS, or both for the weekly report.")
      return
    }

    const response = await mutation.mutateAsync(values)
    if (response.error) {
      setError(response.error.message)
      return
    }
    if (response.data) setValues(cloneAgencySettings(response.data))
  }

  return (
    <section className="space-y-6 text-[#0b1c30]" id="feedback-automation">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">
            <span>Automation</span>
            <AppIcon className="text-sm" name="chevron_right" />
            <span className="text-[#4343d5]">Engine configuration</span>
          </div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
            Feedback Automation Engine
          </h1>
          <p className="mt-1 text-sm text-[#464555] sm:text-base">
            Configure real-time owner feedback workflows and sentiment analysis pipelines.
          </p>
        </div>

        <div className="flex w-fit items-center gap-3 rounded-[24px] border border-[#c7c4d7] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 px-3">
            <span className="size-2 rounded-full bg-[#4fdbc8]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#006b5f]">
              Live engine status
            </span>
          </div>
          <div className="flex rounded-xl bg-[#eff4ff] p-1">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                automation.enabled
                  ? "bg-white text-[#4343d5] shadow-sm"
                  : "text-[#464555]"
              }`}
              onClick={() => patch({ enabled: true, aiFallbackMinConfidence: 0 })}
              type="button"
            >
              Active
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                !automation.enabled
                  ? "bg-white text-[#4343d5] shadow-sm"
                  : "text-[#464555]"
              }`}
              onClick={() => patch({ enabled: false })}
              type="button"
            >
              Paused
            </button>
          </div>
        </div>
      </div>

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Report Schedule</h2>
            <AppIcon className="text-[#8f90ff]" name="calendar_month" />
          </div>
          <p className="mb-6 text-sm leading-6 text-[#464555]">
            Define the recurring weekly window for delivery.
          </p>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <button
                className={`size-10 rounded-lg border text-sm font-bold transition ${
                  automation.gapDays === day.value
                    ? "border-[#4343d5] bg-[#4343d5] text-white shadow-md"
                    : "border-[#c7c4d7] bg-white hover:border-[#4343d5] hover:text-[#4343d5]"
                }`}
                key={day.value}
                onClick={() => patch({ gapDays: day.value })}
                title={day.label}
                type="button"
              >
                {day.short}
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs text-[#767586]">
            Next eligible day: {selectedDay?.label ?? "Monday"}
          </p>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Volume Limits</h2>
            <AppIcon className="text-[#8f90ff]" name="speed" />
          </div>
          <p className="mb-5 text-sm leading-6 text-[#464555]">
            Throttle maximum feedback items per dispatch.
          </p>
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Max Limit</span>
            <span className="font-bold text-[#4343d5]">{automation.maxFeedback} Items</span>
          </div>
          <input
            className="mt-4 h-2 w-full cursor-pointer accent-[#4343d5]"
            max={50}
            min={1}
            onChange={(event) => patch({ maxFeedback: Number(event.target.value) })}
            type="range"
            value={automation.maxFeedback}
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold uppercase text-[#767586]">
            <span>1 item</span>
            <span>50 items</span>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Base Template</h2>
            <AppIcon className="text-[#8f90ff]" name="description" />
          </div>
          <p className="mb-5 text-sm leading-6 text-[#464555]">
            Primary structure for owner notifications.
          </p>
          <Select
            onValueChange={(value) => patch({ templateId: value })}
            value={automation.templateId}
          >
            <SelectTrigger className="h-12 w-full rounded-xl border-[#c7c4d7] bg-[#eff4ff]">
              <SelectValue placeholder="Choose owner template" />
            </SelectTrigger>
            <SelectContent>
              {ownerTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!ownerTemplates.length ? (
            <p className="mt-3 text-xs text-destructive">
              Create and activate an Owner Feedback template before enabling automation.
            </p>
          ) : null}
        </SurfaceCard>
      </div>

      <div>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#464555]">
            Active Delivery Channels
          </h2>
          <div className="h-px flex-1 bg-[#c7c4d7]/60" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <ChannelCard
            checked={automation.channels.includes("Email")}
            description="Rich HTML Reports"
            icon="mail"
            label="Email Dispatch"
            onChange={(checked) => toggleChannel("Email", checked)}
            status={automation.channels.includes("Email") ? "ACTIVE" : "PAUSED"}
          />
          <ChannelCard
            checked={automation.channels.includes("SMS")}
            description="Instant Link Access"
            icon="sms"
            label="SMS Summary"
            onChange={(checked) => toggleChannel("SMS", checked)}
            status={automation.channels.includes("SMS") ? "ACTIVE" : "PAUSED"}
          />
          <ChannelCard
            checked={automation.compressWithAi}
            description="Sentiment summary synthesis"
            icon="auto_awesome"
            label="AI Synthesis"
            onChange={(checked) => patch({ compressWithAi: checked })}
            status={automation.compressWithAi ? "OPTIMIZED" : "PAUSED"}
            teal
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <SurfaceCard className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#e1e0ff] text-[#4343d5]">
                <AppIcon name="psychology" />
              </span>
              <div>
                <h2 className="text-xl font-bold">Classification Logic</h2>
                <p className="text-xs text-[#464555]">Neural Engine Configuration</p>
              </div>
            </div>
            <span className="flex items-center gap-2 text-sm font-bold text-[#4343d5]">
              <AppIcon className="text-lg" name="account_tree" />
              Logic Graph
            </span>
          </div>

          <div className="space-y-8 p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <ConfidenceControl
                label="Auto-Tagging Confidence"
                onChange={(value) => patch({ autoClassifyMinConfidence: value })}
                value={automation.autoClassifyMinConfidence}
              />
              <ConfidenceControl
                label="AI Fallback Floor"
                onChange={(value) => patch({ aiFallbackMinConfidence: value })}
                primary
                value={automation.aiFallbackMinConfidence}
              />
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#c7c4d7] pb-2">
                  <span className="text-xs font-semibold tracking-[0.02em] text-[#b40036]">
                    Out-of-Scope (Negative)
                  </span>
                  <button
                    aria-label="Add negative example"
                    className="text-[#767586] transition hover:text-[#b40036]"
                    onClick={() => addExample("negative")}
                    type="button"
                  >
                    <AppIcon className="text-lg" name="add_circle" />
                  </button>
                </div>

                <div className="flex min-h-20 flex-wrap content-start gap-2">
                  {negativeExamples.map((example, index) => (
                    <span
                      className="group flex max-w-full items-center gap-2 rounded-lg border border-[#c7c4d7] bg-[#eff4ff] px-3 py-1.5 text-[11px] font-medium text-[#464555]"
                      key={`${example}-${index}`}
                    >
                      <span className="truncate">“{example}”</span>
                      <button
                        aria-label={`Remove ${example}`}
                        className="shrink-0 text-[#767586] transition hover:text-[#b40036]"
                        onClick={() => removeExample("negative", index)}
                        type="button"
                      >
                        <AppIcon className="text-sm" name="close" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    className="h-10 rounded-lg border-[#c7c4d7] bg-white text-xs"
                    onChange={(event) => setNegativeDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addExample("negative")
                      }
                    }}
                    placeholder="Add out-of-scope example"
                    value={negativeDraft}
                  />
                  <Button
                    className="size-10 shrink-0 rounded-lg border border-[#c7c4d7] bg-white p-0 text-[#b40036] hover:bg-[#fff1f3]"
                    onClick={() => addExample("negative")}
                    type="button"
                    variant="outline"
                  >
                    <AppIcon name="add" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#c7c4d7] pb-2">
                  <span className="text-xs font-semibold tracking-[0.02em] text-[#4343d5]">
                    Core Feedback (Positive)
                  </span>
                  <button
                    aria-label="Add positive example"
                    className="text-[#767586] transition hover:text-[#4343d5]"
                    onClick={() => addExample("positive")}
                    type="button"
                  >
                    <AppIcon className="text-lg" name="add_circle" />
                  </button>
                </div>

                <div className="min-h-20 space-y-2">
                  {positiveExamples.map((example, index) => (
                    <div
                      className="group flex items-start gap-3 rounded-xl border border-[#4343d5]/10 bg-[#4343d5]/[0.04] p-3"
                      key={`${example}-${index}`}
                    >
                      <AppIcon className="mt-0.5 shrink-0 text-lg text-[#4343d5]" name="chat_bubble" />
                      <p className="min-w-0 flex-1 text-xs italic leading-snug text-[#0b1c30]">
                        “{example}”
                      </p>
                      <button
                        aria-label={`Remove ${example}`}
                        className="shrink-0 text-[#767586] opacity-60 transition hover:text-[#4343d5] group-hover:opacity-100"
                        onClick={() => removeExample("positive", index)}
                        type="button"
                      >
                        <AppIcon className="text-sm" name="close" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    className="h-10 rounded-lg border-[#c7c4d7] bg-white text-xs"
                    onChange={(event) => setPositiveDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        addExample("positive")
                      }
                    }}
                    placeholder="Add core feedback example"
                    value={positiveDraft}
                  />
                  <Button
                    className="size-10 shrink-0 rounded-lg border border-[#c7c4d7] bg-white p-0 text-[#4343d5] hover:bg-[#f1f1ff]"
                    onClick={() => addExample("positive")}
                    type="button"
                    variant="outline"
                  >
                    <AppIcon name="add" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="overflow-hidden">
          <div className="border-b border-[#c7c4d7] bg-[#eff4ff] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Follow-up Suite</h2>
                <p className="mt-1 text-xs text-[#464555]">
                  Select supplemental reports to append.
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#4343d5]">
                {selectedFollowUps.length} selected
              </span>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {followUpTemplates.length ? (
              followUpTemplates.map((template) => {
                const checked = isFollowUpSequence(template.sequenceType)
                return (
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? "border-2 border-[#4343d5] bg-white"
                        : "border-[#c7c4d7] bg-white hover:border-[#4343d5]/60"
                    }`}
                    key={template.id}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#eff4ff] text-[#4343d5]">
                      <AppIcon name="description" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{template.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#464555]">
                        {template.subject}
                      </span>
                    </span>
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleFollowUp(template.id, value === true)}
                    />
                  </label>
                )
              })
            ) : (
              <p className="rounded-xl border border-dashed border-[#c7c4d7] p-7 text-center text-sm text-[#464555]">
                Create another active Owner Feedback template to use it as a follow-up.
              </p>
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 border-t border-[#c7c4d7] bg-white/90 px-4 py-4 shadow-[0_-8px_24px_rgba(11,28,48,0.05)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[#006b5f]">
            <AppIcon className="text-lg" name="cloud_done" />
            <span className="text-xs font-bold">
              {mutation.isPending
                ? "Saving changes..."
                : query.isLoading
                  ? "Loading configuration..."
                  : "Configuration synced with your workspace"}
            </span>
          </div>
          <Button
            className="h-11 rounded-xl bg-[#4343d5] px-7 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]"
            disabled={mutation.isPending || query.isLoading}
            onClick={() => void save()}
            type="button"
          >
            <AppIcon name="save" />
            {mutation.isPending ? "Saving automation..." : "Save Automation Configuration"}
          </Button>
        </div>
      </div>
    </section>
  )
}

function ChannelCard({
  checked,
  description,
  icon,
  label,
  onChange,
  status,
  teal = false,
}: {
  checked: boolean
  description: string
  icon: string
  label: string
  onChange: (checked: boolean) => void
  status: string
  teal?: boolean
}) {
  return (
    <SurfaceCard className="flex items-center gap-4 p-4">
      <span
        className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
          teal ? "bg-[#d9fff8] text-[#006b5f]" : "bg-[#eff0ff] text-[#4343d5]"
        }`}
      >
        <AppIcon name={icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold">{label}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              checked
                ? "bg-[#d9fff8] text-[#006b5f]"
                : "bg-[#e5eeff] text-[#464555]"
            }`}
          >
            {status}
          </span>
        </div>
        <p className="mt-1 text-xs text-[#464555]">{description}</p>
      </div>
      <button
        aria-pressed={checked}
        className={`relative h-5 w-10 shrink-0 rounded-full transition ${
          checked ? "bg-[#4343d5]" : "bg-[#d3e4fe]"
        }`}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </SurfaceCard>
  )
}

function ConfidenceControl({
  label,
  onChange,
  primary = false,
  value,
}: {
  label: string
  onChange: (value: number) => void
  primary?: boolean
  value: number
}) {
  const accent = primary ? "#4343d5" : "#006b5f"
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <AppIcon className="text-lg" name={primary ? "emergency_home" : "verified"} />
          {label}
        </div>
        <span className="text-lg font-bold" style={{ color: accent }}>
          {value}%
        </span>
      </div>
      <Input
        className="h-2 cursor-pointer border-0 p-0 accent-[#4343d5] shadow-none"
        max={100}
        min={primary ? 0 : 1}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
      <p className="text-[11px] leading-5 text-[#464555]">
        {primary
          ? "Confidence level below which items are routed to AI fallback review."
          : "Minimum threshold for automated categorization without human review."}
      </p>
    </div>
  )
}
