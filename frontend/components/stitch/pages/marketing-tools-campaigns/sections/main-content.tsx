"use client"

import { useEffect, useMemo, useState } from "react"

import type {
  MarketingEmailCampaignItem,
  MarketingSettings,
  MarketingSmsStatusItem,
  MarketingTemplateItem,
  MarketingTrendDirection,
  PropertyItem,
} from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useMarketingSettings, useProperties, useUpdateMarketingSettings } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel, formatRelativeTimeLabel, propertyHeroImage } from "@/lib/admin-portal"
import { cloneMarketingSettings, defaultMarketingSettings } from "@/lib/marketing-settings"

const trendOptions: MarketingTrendDirection[] = ["Up", "Down", "Stable"]

type SummaryMetricKey = keyof MarketingSettings["summary"]

type CampaignModalState =
  | { mode: "create" }
  | { mode: "edit"; item: MarketingEmailCampaignItem }
  | null

type SmsModalState =
  | { mode: "create" }
  | { mode: "edit"; item: MarketingSmsStatusItem }
  | null

type TemplateModalState =
  | { mode: "create" }
  | { mode: "edit"; item: MarketingTemplateItem }
  | null

type CampaignFormValues = {
  name: string
  performancePercent: string
  status: string
  type: string
}

type SmsFormValues = {
  lastActivityAt: string
  recipientCount: string
  status: string
  title: string
}

type TemplateFormValues = {
  name: string
  variableHint: string
}

function createClientId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return ""
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return adjusted.toISOString().slice(0, 16)
}

function fromCampaign(item: MarketingEmailCampaignItem): CampaignFormValues {
  return {
    name: item.name ?? "",
    performancePercent: `${item.performancePercent ?? 0}`,
    status: item.status ?? "",
    type: item.type ?? "",
  }
}

function fromSms(item: MarketingSmsStatusItem): SmsFormValues {
  return {
    lastActivityAt: toDateTimeLocal(item.lastActivityAt),
    recipientCount: `${item.recipientCount ?? 0}`,
    status: item.status ?? "",
    title: item.title ?? "",
  }
}

function fromTemplate(item: MarketingTemplateItem): TemplateFormValues {
  return {
    name: item.name ?? "",
    variableHint: item.variableHint ?? "",
  }
}

function trendMeta(trend: MarketingTrendDirection) {
  if (trend === "Up") {
    return {
      icon: "arrow_upward" as const,
      textClassName: "text-emerald-600",
    }
  }

  if (trend === "Down") {
    return {
      icon: "arrow_downward" as const,
      textClassName: "text-rose-600",
    }
  }

  return {
    icon: null,
    textClassName: "text-slate-500",
  }
}

function saveJsonFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function formatMarketingUpdatedAt(value?: string | null) {
  if (!value) {
    return "Not saved yet"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime()) || date.getUTCFullYear() <= 1) {
    return "Not saved yet"
  }

  return formatDateTimeLabel(value)
}

function FieldError({ error }: { error?: string | null }) {
  if (!error) {
    return null
  }

  return <p className="text-xs font-semibold text-rose-600">{error}</p>
}

type CampaignDialogProps = {
  initialValues: CampaignFormValues
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: CampaignFormValues) => void
  open: boolean
}

function CampaignDialog({ initialValues, mode, onClose, onSubmit, open }: CampaignDialogProps) {
  const [formValues, setFormValues] = useState<CampaignFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setError(null)
  }, [initialValues, open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="w-[min(100%-1.5rem,42rem)] max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {mode === "create" ? "Create Campaign" : "Edit Campaign"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Manage the email campaign title, type, status, and performance score shown in the admin dashboard."}
          </DialogDescription>
        </div>
        <form
          className="space-y-5 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault()

            if (formValues.name.trim().length === 0) {
              setError("Campaign name is required.")
              return
            }

            onSubmit(formValues)
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Campaign Name"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Monthly Newsletter - July" value={formValues.name} />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Type"}</span>
              <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, type: event.target.value }))} placeholder="Newsletter" value={formValues.type} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Status"}</span>
              <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))} placeholder="Active" value={formValues.status} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Performance %"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" max="100" min="0" onChange={(event) => setFormValues((current) => ({ ...current, performancePercent: event.target.value }))} type="number" value={formValues.performancePercent} />
          </label>
          <FieldError error={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button className="rounded-xl px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100" onClick={onClose} type="button">{"Cancel"}</button>
            <button className="rounded-xl bg-primary px-7 py-3 font-bold text-white transition-colors hover:bg-primary/90" type="submit">{mode === "create" ? "Add Campaign" : "Save Campaign"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type SmsDialogProps = {
  initialValues: SmsFormValues
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: SmsFormValues) => void
  open: boolean
}

function SmsDialog({ initialValues, mode, onClose, onSubmit, open }: SmsDialogProps) {
  const [formValues, setFormValues] = useState<SmsFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setError(null)
  }, [initialValues, open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="w-[min(100%-1.5rem,42rem)] max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {mode === "create" ? "Add SMS Status" : "Edit SMS Status"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Control the SMS quick status cards shown in the marketing admin dashboard."}
          </DialogDescription>
        </div>
        <form
          className="space-y-5 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault()

            if (formValues.title.trim().length === 0) {
              setError("SMS title is required.")
              return
            }

            onSubmit(formValues)
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"SMS Title"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, title: event.target.value }))} placeholder="Price Drop Alert" value={formValues.title} />
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Recipient Count"}</span>
              <Input className="rounded-xl border-slate-200 bg-slate-50" min="0" onChange={(event) => setFormValues((current) => ({ ...current, recipientCount: event.target.value }))} type="number" value={formValues.recipientCount} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Status"}</span>
              <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))} placeholder="Success" value={formValues.status} />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Last Activity"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, lastActivityAt: event.target.value }))} type="datetime-local" value={formValues.lastActivityAt} />
          </label>
          <FieldError error={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button className="rounded-xl px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100" onClick={onClose} type="button">{"Cancel"}</button>
            <button className="rounded-xl bg-primary px-7 py-3 font-bold text-white transition-colors hover:bg-primary/90" type="submit">{mode === "create" ? "Add SMS Status" : "Save SMS Status"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type TemplateDialogProps = {
  initialValues: TemplateFormValues
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: TemplateFormValues) => void
  open: boolean
}

function TemplateDialog({ initialValues, mode, onClose, onSubmit, open }: TemplateDialogProps) {
  const [formValues, setFormValues] = useState<TemplateFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormValues(initialValues)
    setError(null)
  }, [initialValues, open])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="w-[min(100%-1.5rem,42rem)] max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-2xl font-black text-slate-900">
            {mode === "create" ? "Add Template" : "Edit Template"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {"Manage reusable marketing template entries and their placeholder hints."}
          </DialogDescription>
        </div>
        <form
          className="space-y-5 px-6 py-6"
          onSubmit={(event) => {
            event.preventDefault()

            if (formValues.name.trim().length === 0) {
              setError("Template name is required.")
              return
            }

            onSubmit(formValues)
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Template Name"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))} placeholder="Welcome Client" value={formValues.name} />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Variable Hint"}</span>
            <Input className="rounded-xl border-slate-200 bg-slate-50" onChange={(event) => setFormValues((current) => ({ ...current, variableHint: event.target.value }))} placeholder="Uses: {{client_name}}" value={formValues.variableHint} />
          </label>
          <FieldError error={error} />
          <div className="flex justify-end gap-3 pt-2">
            <button className="rounded-xl px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100" onClick={onClose} type="button">{"Cancel"}</button>
            <button className="rounded-xl bg-primary px-7 py-3 font-bold text-white transition-colors hover:bg-primary/90" type="submit">{mode === "create" ? "Add Template" : "Save Template"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function MainContentSection() {
  const marketingSettingsQuery = useMarketingSettings()
  const updateMutation = useUpdateMarketingSettings()
  const propertiesQuery = useProperties({ page: 1, pageSize: 100 })

  const [campaignModalState, setCampaignModalState] = useState<CampaignModalState>(null)
  const [formValues, setFormValues] = useState<MarketingSettings>(() => cloneMarketingSettings(defaultMarketingSettings))
  const [savedValues, setSavedValues] = useState<MarketingSettings>(() => cloneMarketingSettings(defaultMarketingSettings))
  const [smsModalState, setSmsModalState] = useState<SmsModalState>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [templateModalState, setTemplateModalState] = useState<TemplateModalState>(null)

  useEffect(() => {
    if (!marketingSettingsQuery.data) {
      return
    }

    const nextValues = cloneMarketingSettings(marketingSettingsQuery.data)
    setFormValues(nextValues)
    setSavedValues(cloneMarketingSettings(nextValues))
  }, [marketingSettingsQuery.data])

  const hasPendingChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(savedValues),
    [formValues, savedValues],
  )

  const propertyItems = useMemo(
    () => propertiesQuery.data?.items ?? [],
    [propertiesQuery.data?.items],
  )

  const propertyById = useMemo(
    () => new Map(propertyItems.map((item) => [item.id, item])),
    [propertyItems],
  )

  const summaryCards = [
    {
      accentClassName: "bg-primary",
      icon: "mail",
      key: "emailOpenRate" as SummaryMetricKey,
      label: "Email Open Rate",
      textClassName: "text-primary",
    },
    {
      accentClassName: "bg-secondary",
      icon: "sms",
      key: "smsCtr" as SummaryMetricKey,
      label: "SMS CTR",
      textClassName: "text-secondary",
    },
    {
      accentClassName: "bg-accent",
      icon: "leaderboard",
      key: "conversions" as SummaryMetricKey,
      label: "Conversions",
      textClassName: "text-accent",
    },
    {
      accentClassName: "bg-slate-400",
      icon: "share",
      key: "socialReach" as SummaryMetricKey,
      label: "Social Reach",
      textClassName: "text-slate-400",
    },
  ] as const

  const campaignInitialValues = useMemo<CampaignFormValues>(() => {
    if (campaignModalState?.mode === "edit") {
      return fromCampaign(campaignModalState.item)
    }

    return {
      name: "",
      performancePercent: "0",
      status: "Draft",
      type: "Newsletter",
    }
  }, [campaignModalState])

  const smsInitialValues = useMemo<SmsFormValues>(() => {
    if (smsModalState?.mode === "edit") {
      return fromSms(smsModalState.item)
    }

    return {
      lastActivityAt: toDateTimeLocal(new Date().toISOString()),
      recipientCount: "0",
      status: "Queued",
      title: "",
    }
  }, [smsModalState])

  const templateInitialValues = useMemo<TemplateFormValues>(() => {
    if (templateModalState?.mode === "edit") {
      return fromTemplate(templateModalState.item)
    }

    return {
      name: "",
      variableHint: "Uses: {{placeholder}}",
    }
  }, [templateModalState])

  function updateSettings(update: (current: MarketingSettings) => MarketingSettings) {
    setFormValues((current) => update(current))
    setSubmitError(null)
  }

  async function handleSave() {
    setSubmitError(null)

    const response = await updateMutation.mutateAsync(formValues)

    if (response.error) {
      setSubmitError(response.error.message)
      return
    }

    const nextValues = cloneMarketingSettings(response.data ?? formValues)
    setFormValues(nextValues)
    setSavedValues(cloneMarketingSettings(nextValues))
  }

  function handleExportReport() {
    saveJsonFile(JSON.stringify(formValues, null, 2), "marketing-settings-report.json")
  }

  function handleCampaignSubmit(values: CampaignFormValues) {
    const nextItem: MarketingEmailCampaignItem = {
      id: campaignModalState?.mode === "edit" ? campaignModalState.item.id : createClientId("campaign"),
      name: values.name.trim(),
      performancePercent: clampPercent(Number(values.performancePercent) || 0),
      status: values.status.trim() || "Draft",
      type: values.type.trim() || "Newsletter",
    }

    updateSettings((current) => ({
      ...current,
      emailCampaigns:
        campaignModalState?.mode === "edit"
          ? current.emailCampaigns.map((item) => (item.id === nextItem.id ? nextItem : item))
          : [nextItem, ...current.emailCampaigns],
    }))
    setCampaignModalState(null)
  }

  function handleSmsSubmit(values: SmsFormValues) {
    const nextItem: MarketingSmsStatusItem = {
      id: smsModalState?.mode === "edit" ? smsModalState.item.id : createClientId("sms"),
      lastActivityAt: values.lastActivityAt ? new Date(values.lastActivityAt).toISOString() : new Date().toISOString(),
      recipientCount: Math.max(0, Number(values.recipientCount) || 0),
      status: values.status.trim() || "Queued",
      title: values.title.trim(),
    }

    updateSettings((current) => ({
      ...current,
      smsStatuses:
        smsModalState?.mode === "edit"
          ? current.smsStatuses.map((item) => (item.id === nextItem.id ? nextItem : item))
          : [nextItem, ...current.smsStatuses],
    }))
    setSmsModalState(null)
  }

  function handleTemplateSubmit(values: TemplateFormValues) {
    const nextItem: MarketingTemplateItem = {
      id: templateModalState?.mode === "edit" ? templateModalState.item.id : createClientId("template"),
      name: values.name.trim(),
      variableHint: values.variableHint.trim() || "Uses: {{placeholder}}",
    }

    updateSettings((current) => ({
      ...current,
      templates:
        templateModalState?.mode === "edit"
          ? current.templates.map((item) => (item.id === nextItem.id ? nextItem : item))
          : [nextItem, ...current.templates],
    }))
    setTemplateModalState(null)
  }

  const isLoading =
    !marketingSettingsQuery.data && (marketingSettingsQuery.isLoading || marketingSettingsQuery.isFetching)

  if (isLoading) {
    return (
      <main className="flex-1 p-8">
        <div className="border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400">
          {"Loading marketing settings..."}
        </div>
      </main>
    )
  }

  if (marketingSettingsQuery.error) {
    return (
      <main className="flex-1 p-8">
        <div className="border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-rose-600 dark:border-white/10 dark:bg-slate-900">
          {marketingSettingsQuery.error.message}
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 p-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="mb-2 text-3xl font-black text-primary dark:text-white">
            {"Marketing Tools"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {"Manage campaigns, boost slots, templates, and social automation from the admin panel."}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            {`Last saved ${formatMarketingUpdatedAt(formValues.updatedAt || savedValues.updatedAt)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition-colors hover:bg-slate-50" onClick={handleExportReport} type="button">
            <AppIcon className="text-sm" name="download" />
            {"Export Report"}
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2 font-bold text-white transition-opacity hover:opacity-90" onClick={() => setCampaignModalState({ mode: "create" })} type="button">
            <AppIcon name="add" />
            {"Create Campaign"}
          </button>
          <button className="rounded-lg bg-primary px-6 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={!hasPendingChanges || updateMutation.isPending} onClick={() => void handleSave()} type="button">
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      {submitError ? (
        <div className="mb-6 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {submitError}
        </div>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const metric = formValues.summary[card.key]
          const trend = trendMeta(metric.trendDirection)

          return (
            <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-4 flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <AppIcon className={card.textClassName} name={card.icon} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">{metric.value || "\u2014"}</p>
                <p className={`flex items-center gap-1 text-xs font-bold ${trend.textClassName}`}>
                  {trend.icon ? <AppIcon className="text-xs" name={trend.icon} /> : null}
                  {metric.deltaLabel || "Not set"}
                </p>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className={`h-full rounded-full ${card.accentClassName}`} style={{ width: `${metric.progressPercent}%` }} />
              </div>
              <div className="mt-5 space-y-3">
                <Input className="rounded-lg border-slate-200 bg-slate-50 text-sm" onChange={(event) => updateSettings((current) => ({ ...current, summary: { ...current.summary, [card.key]: { ...current.summary[card.key], value: event.target.value } } }))} placeholder="Value" value={metric.value} />
                <div className="grid grid-cols-[1fr,118px] gap-3">
                  <Input className="rounded-lg border-slate-200 bg-slate-50 text-sm" onChange={(event) => updateSettings((current) => ({ ...current, summary: { ...current.summary, [card.key]: { ...current.summary[card.key], deltaLabel: event.target.value } } }))} placeholder="Change" value={metric.deltaLabel} />
                  <Select modal={false} onValueChange={(value) => updateSettings((current) => ({ ...current, summary: { ...current.summary, [card.key]: { ...current.summary[card.key], trendDirection: (value || "Stable") as MarketingTrendDirection } } }))} value={metric.trendDirection}>
                    <SelectTrigger className="h-auto w-full border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <SelectValue placeholder="Trend" />
                    </SelectTrigger>
                    <SelectContent>
                      {trendOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{"Progress %"}</span>
                  <Input className="rounded-lg border-slate-200 bg-slate-50 text-sm" max="100" min="0" onChange={(event) => updateSettings((current) => ({ ...current, summary: { ...current.summary, [card.key]: { ...current.summary[card.key], progressPercent: clampPercent(Number(event.target.value) || 0) } } }))} type="number" value={`${metric.progressPercent}`} />
                </label>
              </div>
            </div>
          )
        })}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-slate-700">
              <h3 className="text-lg font-bold">{"Email Campaigns"}</h3>
              <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setCampaignModalState({ mode: "create" })} type="button">{"Add Campaign"}</button>
            </div>
            {formValues.emailCampaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-bold uppercase text-slate-500">{"Campaign Name"}</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase text-slate-500">{"Type"}</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase text-slate-500">{"Status"}</th>
                      <th className="px-6 py-3 text-xs font-bold uppercase text-slate-500">{"Performance"}</th>
                      <th className="px-6 py-3 text-right text-xs font-bold uppercase text-slate-500">{"Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {formValues.emailCampaigns.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium">{item.name}</td>
                        <td className="px-6 py-4 text-xs"><span className="rounded bg-primary/10 px-2 py-1 text-primary">{item.type}</span></td>
                        <td className="px-6 py-4 text-xs"><span className="rounded bg-slate-100 px-2 py-1 text-slate-700">{item.status}</span></td>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-primary" style={{ width: `${item.performancePercent}%` }} /></div><span className="text-xs font-bold">{`${item.performancePercent}%`}</span></div></td>
                        <td className="px-6 py-4"><div className="flex justify-end gap-2"><button className="rounded border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary" onClick={() => setCampaignModalState({ mode: "edit", item })} type="button">{"Edit"}</button><button className="rounded border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-600 hover:border-rose-300 hover:text-rose-700" onClick={() => updateSettings((current) => ({ ...current, emailCampaigns: current.emailCampaigns.filter((campaign) => campaign.id !== item.id) }))} type="button">{"Delete"}</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-sm font-semibold text-slate-500 dark:text-slate-400">{"No email campaigns configured yet."}</div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold">{"SMS Quick Status"}</h3>
              <button className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline" onClick={() => setSmsModalState({ mode: "create" })} type="button"><AppIcon className="text-sm" name="send" />{"New SMS"}</button>
            </div>
            {formValues.smsStatuses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {formValues.smsStatuses.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-background-light p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3"><AppIcon className="text-secondary" name="textsms" /><p className="text-sm font-bold">{item.title}</p></div>
                      <div className="flex gap-2"><button className="text-xs font-bold text-slate-500 hover:text-primary" onClick={() => setSmsModalState({ mode: "edit", item })} type="button">{"Edit"}</button><button className="text-xs font-bold text-rose-600 hover:text-rose-700" onClick={() => updateSettings((current) => ({ ...current, smsStatuses: current.smsStatuses.filter((status) => status.id !== item.id) }))} type="button">{"Delete"}</button></div>
                    </div>
                    <p className="mb-3 text-xs text-slate-500">{`Sent to ${item.recipientCount} recipients`}</p>
                    <div className="flex items-center justify-between gap-3"><span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">{item.status || "Draft"}</span><span className="text-xs text-slate-400" title={formatDateTimeLabel(item.lastActivityAt)}>{formatRelativeTimeLabel(item.lastActivityAt)}</span></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No SMS status cards configured yet."}</div>
            )}
          </section>
        </div>
        <div className="space-y-8">
          <section className="rounded-xl bg-primary p-6 text-white">
            <div className="mb-4 flex items-center gap-2">
              <AppIcon name="rocket_launch" />
              <h3 className="text-lg font-bold">{formValues.homepageBoost.title || "Homepage Boost"}</h3>
            </div>
            <Textarea className="min-h-24 border-white/20 bg-white/10 p-4 text-sm text-white placeholder:text-white/60" onChange={(event) => updateSettings((current) => ({ ...current, homepageBoost: { ...current.homepageBoost, description: event.target.value } }))} placeholder="Boost description" value={formValues.homepageBoost.description} />
            <Input className="mt-4 border-white/20 bg-white/10 text-sm text-white placeholder:text-white/60" onChange={(event) => updateSettings((current) => ({ ...current, homepageBoost: { ...current.homepageBoost, buttonLabel: event.target.value } }))} placeholder="Button label" value={formValues.homepageBoost.buttonLabel} />
            <div className="mt-6 space-y-4">
              {formValues.homepageBoost.slots.map((slot, index) => {
                const property = slot.propertyId ? propertyById.get(slot.propertyId) : null

                return (
                  <div key={slot.id} className="rounded-lg bg-white/10 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{`Boost Slot ${index + 1}`}</p>
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-white/80">
                        <input checked={slot.isActive} className="form-checkbox rounded border-white/30 bg-transparent text-white focus:ring-white" onChange={(event) => updateSettings((current) => ({ ...current, homepageBoost: { ...current.homepageBoost, slots: current.homepageBoost.slots.map((item) => item.id === slot.id ? { ...item, isActive: event.target.checked } : item) } }))} type="checkbox" />
                        {"Active"}
                      </label>
                    </div>
                    <Select modal={false} onValueChange={(value) => updateSettings((current) => ({ ...current, homepageBoost: { ...current.homepageBoost, slots: current.homepageBoost.slots.map((item) => item.id === slot.id ? { ...item, propertyId: !value || value === "none" ? null : Number(value) } : item) } }))} value={slot.propertyId ? `${slot.propertyId}` : "none"}>
                      <SelectTrigger className="h-auto w-full border-white/20 bg-white/10 px-3 py-2 text-sm text-white">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{"No property selected"}</SelectItem>
                        {propertyItems.map((item) => (
                          <SelectItem key={item.id} value={`${item.id}`}>{item.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {property ? (
                      <div className="mt-3 flex items-center gap-3 rounded-lg bg-white/10 p-3">
                        <div className="h-12 w-12 rounded bg-cover bg-center" style={{ backgroundImage: `url("${propertyHeroImage(property as PropertyItem)}")` }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold leading-none">{property.title}</p>
                          <p className="truncate text-[10px] text-white/60">{property.exactLocation || property.location}</p>
                        </div>
                        <AppIcon className={slot.isActive ? "text-green-400 text-sm" : "text-white/40 text-sm"} name={slot.isActive ? "check_circle" : "toggle_off"} />
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-white/60">{"Choose a property to feature in this boost slot."}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">{"Template Library"}</h3>
              <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setTemplateModalState({ mode: "create" })} type="button">{"Add Template"}</button>
            </div>
            {formValues.templates.length > 0 ? (
              <div className="space-y-3">
                {formValues.templates.map((item) => (
                  <div key={item.id} className="group flex items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:border-primary dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <AppIcon className="text-slate-400 group-hover:text-primary" name="description" />
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-[10px] text-slate-400">{item.variableHint}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs font-bold text-slate-500 hover:text-primary" onClick={() => setTemplateModalState({ mode: "edit", item })} type="button">{"Edit"}</button>
                      <button className="text-xs font-bold text-rose-600 hover:text-rose-700" onClick={() => updateSettings((current) => ({ ...current, templates: current.templates.filter((template) => template.id !== item.id) }))} type="button">{"Delete"}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{"No templates configured yet."}</div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-lg font-bold">{"Social Sharing"}</h3>
            <div className="mb-4 grid grid-cols-4 gap-4">
              {formValues.socialSharing.channels.map((channel) => (
                <button key={channel.id} className={`flex size-10 items-center justify-center rounded text-white transition-opacity hover:opacity-90 ${channel.accentClassName} ${channel.isEnabled ? "" : "opacity-35"}`} onClick={() => updateSettings((current) => ({ ...current, socialSharing: { ...current.socialSharing, channels: current.socialSharing.channels.map((item) => item.id === channel.id ? { ...item, isEnabled: !item.isEnabled } : item) } }))} title={channel.label} type="button">
                  <AppIcon name={channel.icon as never} />
                </button>
              ))}
            </div>
            <label className="mb-4 flex items-center gap-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <input checked={formValues.socialSharing.autoPostEnabled} className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary" onChange={(event) => updateSettings((current) => ({ ...current, socialSharing: { ...current.socialSharing, autoPostEnabled: event.target.checked } }))} type="checkbox" />
              {"Enable auto-post for new listings"}
            </label>
            <Textarea className="min-h-28 border-slate-200 bg-slate-50 p-4" onChange={(event) => updateSettings((current) => ({ ...current, socialSharing: { ...current.socialSharing, autoPostMessage: event.target.value } }))} placeholder="Auto-post description" value={formValues.socialSharing.autoPostMessage} />
          </section>
        </div>
      </div>

      <CampaignDialog initialValues={campaignInitialValues} mode={campaignModalState?.mode ?? "create"} onClose={() => setCampaignModalState(null)} onSubmit={handleCampaignSubmit} open={campaignModalState !== null} />
      <SmsDialog initialValues={smsInitialValues} mode={smsModalState?.mode ?? "create"} onClose={() => setSmsModalState(null)} onSubmit={handleSmsSubmit} open={smsModalState !== null} />
      <TemplateDialog initialValues={templateInitialValues} mode={templateModalState?.mode ?? "create"} onClose={() => setTemplateModalState(null)} onSubmit={handleTemplateSubmit} open={templateModalState !== null} />
    </main>
  )
}
