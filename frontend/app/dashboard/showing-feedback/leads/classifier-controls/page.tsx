"use client"

import { useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAgencySettings, useUpdateAgencySettings } from "@/hooks/use-real-estate-api"
import {
  cloneAgencySettings,
  defaultAgencySettings,
  type AgencyWorkspaceSettings,
} from "@/lib/agency-settings"

type Settings = {
  hotPriority: number
  applyThreshold: number
  urgencyBoost: number
  positiveBoost: number
  negativePenalty: number
  autoClassifyMinConfidence: number
  aiFallbackMinConfidence: number
  positiveKnowledge: string
  negativeKnowledge: string
}

type ClassifierControls = Pick<
  Settings,
  "hotPriority" | "applyThreshold" | "urgencyBoost" | "positiveBoost" | "negativePenalty"
>

type NumericSettingKey = Exclude<keyof Settings, "positiveKnowledge" | "negativeKnowledge">

type AgencySettingsWithClassifier = AgencyWorkspaceSettings & {
  leadShowingClassifierControls?: Partial<ClassifierControls>
}

const defaults: Settings = {
  hotPriority: 70,
  applyThreshold: 65,
  urgencyBoost: 20,
  positiveBoost: 10,
  negativePenalty: 20,
  autoClassifyMinConfidence: defaultAgencySettings.showingFeedbackAutomation.autoClassifyMinConfidence,
  aiFallbackMinConfidence: defaultAgencySettings.showingFeedbackAutomation.aiFallbackMinConfidence,
  positiveKnowledge: defaultAgencySettings.showingFeedbackAutomation.positiveKnowledge,
  negativeKnowledge: defaultAgencySettings.showingFeedbackAutomation.negativeKnowledge,
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[24px] border border-[#c7c4d7] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] ${className}`}>{children}</div>
}

export default function LeadClassifierControlsPage() {
  const [settings, setSettings] = useState<Settings>(defaults)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const query = useAgencySettings()
  const mutation = useUpdateAgencySettings()

  useEffect(() => {
    if (!query.data) return
    const source = query.data as AgencySettingsWithClassifier
    const values = cloneAgencySettings(source)
    setSettings({
      ...defaults,
      ...(source.leadShowingClassifierControls ?? {}),
      autoClassifyMinConfidence: values.showingFeedbackAutomation.autoClassifyMinConfidence,
      aiFallbackMinConfidence: values.showingFeedbackAutomation.aiFallbackMinConfidence,
      negativeKnowledge: values.showingFeedbackAutomation.negativeKnowledge,
      positiveKnowledge: values.showingFeedbackAutomation.positiveKnowledge,
    })
  }, [query.data])

  const scoreHealth = useMemo(() => {
    const values = [
      settings.hotPriority,
      settings.applyThreshold,
      settings.autoClassifyMinConfidence,
      100 - settings.negativePenalty,
    ]
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
  }, [settings])

  function updateNumber<K extends NumericSettingKey>(key: K, value: string) {
    setSettings((current) => ({ ...current, [key]: Math.max(0, Math.min(100, Number(value) || 0)) }))
    setSaved(false)
  }

  function updateText<K extends "positiveKnowledge" | "negativeKnowledge">(key: K, value: string) {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  async function save() {
    setError(null)
    const current: AgencyWorkspaceSettings = cloneAgencySettings(query.data ?? defaultAgencySettings)
    const nextSettings: AgencySettingsWithClassifier = {
      ...current,
      leadShowingClassifierControls: {
        hotPriority: settings.hotPriority,
        applyThreshold: settings.applyThreshold,
        urgencyBoost: settings.urgencyBoost,
        positiveBoost: settings.positiveBoost,
        negativePenalty: settings.negativePenalty,
      },
      showingFeedbackAutomation: {
        ...current.showingFeedbackAutomation,
        autoClassifyMinConfidence: Math.max(1, settings.autoClassifyMinConfidence),
        aiFallbackMinConfidence: settings.aiFallbackMinConfidence,
        negativeKnowledge: settings.negativeKnowledge,
        positiveKnowledge: settings.positiveKnowledge,
      },
    }
    const response = await mutation.mutateAsync(nextSettings)
    if (response.error) {
      setError(response.error.message)
      return
    }
    setSaved(true)
  }

  return (
    <main className="min-h-full bg-[#f8f9ff] px-4 pb-32 pt-5 sm:px-6 lg:px-8 lg:pt-8">
      <section className="mx-auto max-w-[1500px] space-y-6 text-[#0b1c30]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#464555]">
              <span>Automation</span>
              <AppIcon className="text-sm" name="chevron_right" />
              <span className="text-[#4343d5]">Classifier controls</span>
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">Advanced Classifier Controls</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#464555] sm:text-base">
              Tune how lead and tenant showing replies are ranked for urgency, application intent, positive signals, and objections.
            </p>
          </div>

          <div className="flex w-fit items-center gap-3 rounded-[24px] border border-[#c7c4d7] bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2 px-3">
              <span className="size-2 rounded-full bg-[#4fdbc8]" />
              <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-[#006b5f]">Classifier status</span>
            </div>
            <div className="rounded-xl bg-[#eff4ff] px-4 py-2 text-sm font-bold text-[#4343d5]">{scoreHealth}% tuned</div>
          </div>
        </div>

        {query.error ? <Alert variant="destructive"><AlertDescription>{query.error.message}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <div className="grid gap-6 lg:grid-cols-3">
          <SurfaceCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Hot Prospect</h2>
              <AppIcon className="text-[#8f90ff]" name="local_fire_department" />
            </div>
            <p className="mb-6 text-sm leading-6 text-[#464555]">Set the score required to classify a lead as high priority.</p>
            <ConfidenceControl label="Hot prospect score" onChange={(value) => updateNumber("hotPriority", String(value))} value={settings.hotPriority} />
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Application Intent</h2>
              <AppIcon className="text-[#8f90ff]" name="assignment_turned_in" />
            </div>
            <p className="mb-6 text-sm leading-6 text-[#464555]">Minimum likelihood required to treat a reply as application-ready.</p>
            <ConfidenceControl label="Intent threshold" onChange={(value) => updateNumber("applyThreshold", String(value))} value={settings.applyThreshold} />
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Automation Floor</h2>
              <AppIcon className="text-[#8f90ff]" name="psychology" />
            </div>
            <p className="mb-6 text-sm leading-6 text-[#464555]">Clear replies at or above this confidence are classified without AI.</p>
            <ConfidenceControl label="Auto-classify confidence" onChange={(value) => updateNumber("autoClassifyMinConfidence", String(value))} value={settings.autoClassifyMinConfidence} />
          </SurfaceCard>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#464555]">Signal Weighting</h2>
            <div className="h-px flex-1 bg-[#c7c4d7]/60" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <SignalCard icon="bolt" label="Urgency Signal" value={settings.urgencyBoost} tone="primary" onChange={(value) => updateNumber("urgencyBoost", value)} help="Boost for ASAP, today, ready now, or this week." />
            <SignalCard icon="thumb_up" label="Positive Signal" value={settings.positiveBoost} tone="secondary" onChange={(value) => updateNumber("positiveBoost", value)} help="Boost for strong positive interest." />
            <SignalCard icon="thumb_down" label="Negative Penalty" value={settings.negativePenalty} tone="tertiary" onChange={(value) => updateNumber("negativePenalty", value)} help="Penalty for price, condition, size, or pass signals." />
            <SignalCard icon="smart_toy" label="AI Fallback" value={settings.aiFallbackMinConfidence} tone="primary" onChange={(value) => updateNumber("aiFallbackMinConfidence", value)} help="Use 0 to let AI review every uncertain reply." />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <SurfaceCard className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#c7c4d7] bg-[#eff4ff] px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-[#e1e0ff] text-[#4343d5]"><AppIcon name="psychology" /></span>
                <div>
                  <h2 className="text-xl font-bold">Classification Knowledge</h2>
                  <p className="text-xs text-[#464555]">Positive and negative examples used by the classifier.</p>
                </div>
              </div>
              <span className="flex items-center gap-2 text-sm font-bold text-[#4343d5]"><AppIcon className="text-lg" name="account_tree" />Knowledge graph</span>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-2">
              <KnowledgeField label="Negative knowledge" tone="negative" value={settings.negativeKnowledge} onChange={(value) => updateText("negativeKnowledge", value)} />
              <KnowledgeField label="Positive knowledge" tone="positive" value={settings.positiveKnowledge} onChange={(value) => updateText("positiveKnowledge", value)} />
            </div>
          </SurfaceCard>

          <SurfaceCard className="overflow-hidden">
            <div className="border-b border-[#c7c4d7] bg-[#eff4ff] px-4 py-4">
              <h2 className="text-xl font-semibold">Classifier Summary</h2>
              <p className="mt-1 text-xs text-[#464555]">Current live scoring configuration.</p>
            </div>
            <div className="space-y-3 p-4">
              <SummaryRow label="Hot priority" value={`${settings.hotPriority}%`} />
              <SummaryRow label="Application threshold" value={`${settings.applyThreshold}%`} />
              <SummaryRow label="Auto-classify" value={`${settings.autoClassifyMinConfidence}%`} />
              <SummaryRow label="AI fallback" value={`${settings.aiFallbackMinConfidence}%`} />
              <SummaryRow label="Positive examples" value={String(settings.positiveKnowledge.split("\n").filter(Boolean).length)} />
              <SummaryRow label="Negative examples" value={String(settings.negativeKnowledge.split("\n").filter(Boolean).length)} />
            </div>
          </SurfaceCard>
        </div>

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-[#c7c4d7] bg-white/90 px-4 py-4 shadow-[0_-8px_24px_rgba(11,28,48,0.05)] backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-[#006b5f]">
              <AppIcon className="text-lg" name={saved ? "cloud_done" : "cloud_sync"} />
              <span className="text-xs font-bold">{mutation.isPending ? "Saving changes..." : query.isLoading ? "Loading classifier settings..." : saved ? "Classifier controls saved" : "Classifier settings loaded from your workspace"}</span>
            </div>
            <Button className="h-11 rounded-xl bg-[#4343d5] px-7 font-bold text-white shadow-lg shadow-[#4343d5]/20 hover:bg-[#3737bd]" disabled={mutation.isPending || query.isLoading} onClick={() => void save()} type="button"><AppIcon name="save" />{mutation.isPending ? "Saving classifier..." : "Save Classifier Controls"}</Button>
          </div>
        </div>
      </section>
    </main>
  )
}

function ConfidenceControl({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return <div className="space-y-3"><div className="flex items-end justify-between gap-3"><span className="text-sm font-bold">{label}</span><span className="text-lg font-bold text-[#4343d5]">{value}%</span></div><Input className="h-2 cursor-pointer border-0 p-0 accent-[#4343d5] shadow-none" max={100} min={0} onChange={(event) => onChange(Number(event.target.value))} type="range" value={value} /></div>
}

function SignalCard({ help, icon, label, onChange, tone, value }: { help: string; icon: string; label: string; onChange: (value: string) => void; tone: "primary" | "secondary" | "tertiary"; value: number }) {
  const toneClass = tone === "secondary" ? "bg-[#d9fff8] text-[#006b5f]" : tone === "tertiary" ? "bg-[#fff1f3] text-[#b40036]" : "bg-[#eff0ff] text-[#4343d5]"
  return <SurfaceCard className="p-4"><div className="flex items-start gap-3"><span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><AppIcon name={icon} /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold">{label}</span><span className="text-lg font-bold text-[#4343d5]">{value}</span></div><p className="mt-1 text-xs leading-5 text-[#464555]">{help}</p></div></div><Input className="mt-4 h-11 rounded-xl border-[#c7c4d7] bg-[#eff4ff]" max={100} min={0} onChange={(event) => onChange(event.target.value)} type="number" value={value} /></SurfaceCard>
}

function KnowledgeField({ label, onChange, tone, value }: { label: string; onChange: (value: string) => void; tone: "positive" | "negative"; value: string }) {
  const [draft, setDraft] = useState("")
  const examples = value.split("\n").map((item) => item.trim()).filter(Boolean)
  const isPositive = tone === "positive"

  function add() {
    const next = draft.trim()
    if (!next) return
    onChange([...examples, next].join("\n"))
    setDraft("")
  }

  function remove(index: number) {
    onChange(examples.filter((_, itemIndex) => itemIndex !== index).join("\n"))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#c7c4d7] pb-2">
        <span className={isPositive ? "text-xs font-semibold text-[#4343d5]" : "text-xs font-semibold text-[#b40036]"}>{label}</span>
        <button className={isPositive ? "text-[#4343d5]" : "text-[#b40036]"} onClick={add} type="button">
          <AppIcon className="text-lg" name="add_circle" />
        </button>
      </div>
      <div className={isPositive ? "min-h-44 space-y-2" : "flex min-h-44 flex-wrap content-start gap-2"}>
        {examples.map((example, index) => isPositive ? (
          <div className="group flex items-start gap-3 rounded-xl border border-[#4343d5]/10 bg-[#4343d5]/[0.04] p-3" key={`${example}-${index}`}>
            <AppIcon className="mt-0.5 shrink-0 text-lg text-[#4343d5]" name="chat_bubble" />
            <p className="min-w-0 flex-1 text-xs italic leading-snug text-[#0b1c30]">“{example}”</p>
            <button aria-label={`Remove ${example}`} className="text-[#767586] transition hover:text-[#4343d5]" onClick={() => remove(index)} type="button"><AppIcon className="text-sm" name="close" /></button>
          </div>
        ) : (
          <span className="group flex max-w-full items-center gap-2 rounded-lg border border-[#c7c4d7] bg-[#eff4ff] px-3 py-1.5 text-[11px] font-medium text-[#464555]" key={`${example}-${index}`}>
            <span className="truncate">“{example}”</span>
            <button aria-label={`Remove ${example}`} className="text-[#767586] transition hover:text-[#b40036]" onClick={() => remove(index)} type="button"><AppIcon className="text-sm" name="close" /></button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input className="h-10 rounded-lg border-[#c7c4d7] bg-white text-xs" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add() } }} placeholder={isPositive ? "Add core feedback example" : "Add out-of-scope example"} value={draft} />
        <Button className={`size-10 shrink-0 rounded-lg border border-[#c7c4d7] bg-white p-0 ${isPositive ? "text-[#4343d5]" : "text-[#b40036]"}`} onClick={add} type="button" variant="outline"><AppIcon name="add" /></Button>
      </div>
    </div>
  )
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-xl border border-[#c7c4d7] bg-white px-4 py-3"><span className="text-sm text-[#464555]">{label}</span><span className="text-sm font-bold text-[#4343d5]">{value}</span></div>
}


