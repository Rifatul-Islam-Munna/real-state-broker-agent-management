"use client"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ShowingFeedbackAutomationSettings } from "@/lib/agency-settings"

export function ShowingFeedbackAutomationSection({
  onChange,
  settings,
  templates,
}: {
  onChange: (settings: ShowingFeedbackAutomationSettings) => void
  settings: ShowingFeedbackAutomationSettings
  templates: AgencyCommunicationTemplateItem[]
}) {
  const ownerTemplates = templates.filter(
    (template) => template.audience === "OwnerFeedback" && template.isActive !== false,
  )

  function patch(next: Partial<ShowingFeedbackAutomationSettings>) {
    onChange({ ...settings, ...next })
  }

  function toggleChannel(channel: "Email" | "SMS", checked: boolean) {
    const channels = checked
      ? [...new Set([...settings.channels, channel])]
      : settings.channels.filter((item) => item !== channel)
    patch({ channels: channels.length ? channels : [channel] })
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/30">
            <AppIcon name="rate_review" />
          </span>
          <div>
            <CardTitle className="text-lg">{"Automatic showing feedback reports"}</CardTitle>
            <CardDescription className="mt-1 max-w-3xl leading-6">
              {"Classify realtor replies locally first, keep positive and negative feedback, then send only negative owner reports automatically."}
            </CardDescription>
          </div>
        </div>
        <Badge variant={settings.enabled ? "secondary" : "outline"}>
          {settings.enabled ? "Automation active" : "Automation paused"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
          <Checkbox
            checked={settings.enabled}
            onCheckedChange={(value) => patch({ enabled: value === true })}
          />
          <span>
            <span className="block text-sm font-semibold">{"Enable automatic owner reports"}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {"The worker checks every 10 minutes. A zero-day gap sends on the next worker run."}
            </span>
          </span>
        </label>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>{"Wait after first unsent reply"}</Label>
            <div className="relative">
              <Input
                min={0}
                max={365}
                onChange={(event) => patch({ gapDays: Math.min(365, Math.max(0, Number(event.target.value) || 0)) })}
                type="number"
                value={settings.gapDays}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{"days"}</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{"Maximum feedback per report"}</Label>
            <Input
              min={1}
              max={50}
              onChange={(event) => patch({ maxFeedback: Math.min(50, Math.max(1, Number(event.target.value) || 1)) })}
              type="number"
              value={settings.maxFeedback}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>{"Active owner report template"}</Label>
            <Select onValueChange={(value) => patch({ templateId: value })} value={settings.templateId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose owner template" /></SelectTrigger>
              <SelectContent>
                {ownerTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ownerTemplates.length === 0 ? (
              <p className="text-xs text-destructive">{"Create and activate an Owner Feedback template before enabling automation."}</p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Toggle
            checked={settings.channels.includes("Email")}
            description="Send the rendered report to the property owner email."
            label="Email"
            onChange={(checked) => toggleChannel("Email", checked)}
          />
          <Toggle
            checked={settings.channels.includes("SMS")}
            description="Send the report to the property owner phone through the configured SMS provider."
            label="SMS"
            onChange={(checked) => toggleChannel("SMS", checked)}
          />
          <Toggle
            checked={settings.compressWithAi}
            description="Use the configured AI provider to compress the feedback into a concise owner summary."
            label="Use AI compression"
            onChange={(checked) => patch({ compressWithAi: checked })}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label>{"Negative feedback knowledge"}</Label>
            <Textarea
              className="min-h-36"
              onChange={(event) => patch({ negativeKnowledge: event.target.value })}
              placeholder="One example or rule per line"
              value={settings.negativeKnowledge}
            />
          </div>
          <div className="space-y-2">
            <Label>{"Positive feedback knowledge"}</Label>
            <Textarea
              className="min-h-36"
              onChange={(event) => patch({ positiveKnowledge: event.target.value })}
              placeholder="One example or rule per line"
              value={settings.positiveKnowledge}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{"Auto-classify confidence"}</Label>
            <Input
              min={1}
              max={100}
              onChange={(event) => patch({ autoClassifyMinConfidence: Math.min(100, Math.max(1, Number(event.target.value) || 1)) })}
              type="number"
              value={settings.autoClassifyMinConfidence}
            />
          </div>
          <div className="space-y-2">
            <Label>{"AI fallback from confidence"}</Label>
            <Input
              min={0}
              max={100}
              onChange={(event) => patch({ aiFallbackMinConfidence: Math.min(100, Math.max(0, Number(event.target.value) || 0)) })}
              type="number"
              value={settings.aiFallbackMinConfidence}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Toggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-4">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}
