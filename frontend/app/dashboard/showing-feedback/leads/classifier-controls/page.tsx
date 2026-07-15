"use client"

import { useEffect, useState } from "react"
import { Save, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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

  return <main className="space-y-6 p-4 md:p-6">
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="size-4"/>Lead showing classifier</div>
      <h1 className="text-3xl font-bold tracking-tight">Advanced Classifier Controls</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">Tune how lead and tenant showing replies are ranked for urgency, application intent, positive signals, and objections.</p>
    </div>

    <Card>
      <CardHeader><CardTitle>Scoring thresholds</CardTitle><CardDescription>These settings control how the lead showing inbox highlights revenue opportunities and urgent follow-up.</CardDescription></CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Hot prospect score" value={settings.hotPriority} onChange={(value)=>updateNumber("hotPriority", value)} help="Feedback at or above this score is marked hot." />
        <Field label="Application intent threshold" value={settings.applyThreshold} onChange={(value)=>updateNumber("applyThreshold", value)} help="Minimum likelihood required to treat a reply as application-ready." />
        <Field label="Urgency signal boost" value={settings.urgencyBoost} onChange={(value)=>updateNumber("urgencyBoost", value)} help="Score boost for words such as ASAP, today, ready now, or this week." />
        <Field label="Positive signal boost" value={settings.positiveBoost} onChange={(value)=>updateNumber("positiveBoost", value)} help="Score boost for strong positive interest." />
        <Field label="Negative objection penalty" value={settings.negativePenalty} onChange={(value)=>updateNumber("negativePenalty", value)} help="Penalty for price, condition, size, or pass signals." />
        <Field label="Local auto-classify confidence" value={settings.autoClassifyMinConfidence} onChange={(value)=>updateNumber("autoClassifyMinConfidence", value)} help="Clear replies at or above this confidence are classified without AI." />
        <Field label="AI fallback floor" value={settings.aiFallbackMinConfidence} onChange={(value)=>updateNumber("aiFallbackMinConfidence", value)} help="Use 0 to let AI review every uncertain reply." />
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Positive and negative knowledge</CardTitle><CardDescription>These examples are used by the showing feedback classifier and owner feedback automation.</CardDescription></CardHeader>
      <CardContent className="grid gap-5 lg:grid-cols-2">
        <TextField label="Negative knowledge" value={settings.negativeKnowledge} onChange={(value)=>updateText("negativeKnowledge", value)} />
        <TextField label="Positive knowledge" value={settings.positiveKnowledge} onChange={(value)=>updateText("positiveKnowledge", value)} />
      </CardContent>
    </Card>

    <div className="flex items-center gap-3"><Button disabled={mutation.isPending || query.isLoading} onClick={() => void save()}><Save className="mr-2 size-4"/>{mutation.isPending ? "Saving..." : "Save classifier controls"}</Button>{saved ? <span className="text-sm text-emerald-700">Saved</span> : null}{error ? <span className="text-sm text-destructive">{error}</span> : null}</div>
  </main>
}

function Field({ label, value, onChange, help }: { label: string; value: number; onChange: (value: string) => void; help: string }) {
  return <div className="space-y-2 rounded-xl border p-4"><Label>{label}</Label><Input type="number" min={0} max={100} value={value} onChange={(event)=>onChange(event.target.value)}/><p className="text-xs text-muted-foreground">{help}</p></div>
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2 rounded-xl border p-4"><Label>{label}</Label><Textarea className="min-h-40" placeholder="One example per line" value={value} onChange={(event)=>onChange(event.target.value)}/></div>
}
