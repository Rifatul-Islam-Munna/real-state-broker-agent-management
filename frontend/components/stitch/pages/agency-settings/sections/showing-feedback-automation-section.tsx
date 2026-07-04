"use client"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ShowingFeedbackAutomationSettings } from "@/lib/agency-settings"

const weekDays = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
]

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
    (template) =>
      template.audience === "OwnerFeedback" && template.isActive !== false
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

  const selectedDay = weekDays.find(
    (day) => day.value === Math.min(6, Math.max(0, settings.gapDays))
  )

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-muted/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-background">
              <AppIcon name="rate_review" />
            </span>
            <div>
              <CardTitle className="text-lg">
                {"Weekly owner feedback automation"}
              </CardTitle>
              <CardDescription className="mt-1 max-w-3xl leading-6">
                {
                  "Collect replies from email and SMS, classify them as positive or negative, then send a property owner report every week on the selected day."
                }
              </CardDescription>
            </div>
          </div>
          <Badge
            className="w-fit"
            variant={settings.enabled ? "secondary" : "outline"}
          >
            {settings.enabled ? "Automation active" : "Automation paused"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-5 sm:p-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-background p-4">
          <Checkbox
            checked={settings.enabled}
            onCheckedChange={(value) =>
              patch({
                enabled: value === true,
                aiFallbackMinConfidence:
                  value === true ? 0 : settings.aiFallbackMinConfidence,
              })
            }
          />
          <span>
            <span className="block text-sm font-semibold">
              {"Enable weekly automatic owner reports"}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              {
                "The worker runs every 10 minutes. It sends once on the chosen weekday, in the agency timezone, only when new positive or negative feedback exists."
              }
            </span>
          </span>
        </label>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,1.5fr)]">
          <div className="space-y-2">
            <Label>{"Weekly report day"}</Label>
            <Select
              onValueChange={(value) => patch({ gapDays: Number(value) })}
              value={String(selectedDay?.value ?? 1)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose weekday" />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day) => (
                  <SelectItem key={day.value} value={String(day.value)}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs leading-5 text-muted-foreground">
              {`The next report is eligible on ${selectedDay?.label ?? "Monday"}.`}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{"Maximum feedback per report"}</Label>
            <Input
              min={1}
              max={50}
              onChange={(event) =>
                patch({
                  maxFeedback: Math.min(
                    50,
                    Math.max(1, Number(event.target.value) || 1)
                  ),
                })
              }
              type="number"
              value={settings.maxFeedback}
            />
            <p className="text-xs leading-5 text-muted-foreground">
              {
                "Older unsent feedback remains queued for a later weekly report."
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label>{"Owner report template"}</Label>
            <Select
              onValueChange={(value) => patch({ templateId: value })}
              value={settings.templateId}
            >
              <SelectTrigger className="w-full">
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
            {ownerTemplates.length === 0 ? (
              <p className="text-xs leading-5 text-destructive">
                {
                  "Create and activate an Owner Feedback template before enabling automation."
                }
              </p>
            ) : (
              <p className="text-xs leading-5 text-muted-foreground">
                {
                  "Reports keep positive and negative feedback in separate sections while remaining compatible with existing feedback tokens."
                }
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Toggle
            checked={settings.channels.includes("Email")}
            description="Send the rendered weekly report to the property owner email."
            label="Email"
            onChange={(checked) => toggleChannel("Email", checked)}
          />
          <Toggle
            checked={settings.channels.includes("SMS")}
            description="Send the same report to the property owner phone through the configured SMS provider."
            label="SMS"
            onChange={(checked) => toggleChannel("SMS", checked)}
          />
          <Toggle
            checked={settings.compressWithAi}
            description="Create concise positive and negative summaries before rendering the selected template."
            label="AI summary"
            onChange={(checked) => patch({ compressWithAi: checked })}
          />
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
              <AppIcon name="psychology" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {"Hybrid reply classification"}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {
                  "Clear replies are classified locally. Uncertain, mixed, or unusual replies are reviewed by the configured AI provider. A reply still stops every pending email and SMS follow-up immediately, even when it is only an acknowledgement and not usable feedback."
                }
              </p>
            </div>
          </div>
        </div>

        <details className="rounded-xl border bg-background">
          <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
            {"Advanced classifier controls"}
          </summary>
          <div className="space-y-5 border-t p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{"Local auto-classify confidence"}</Label>
                <Input
                  min={1}
                  max={100}
                  onChange={(event) =>
                    patch({
                      autoClassifyMinConfidence: Math.min(
                        100,
                        Math.max(1, Number(event.target.value) || 1)
                      ),
                    })
                  }
                  type="number"
                  value={settings.autoClassifyMinConfidence}
                />
              </div>
              <div className="space-y-2">
                <Label>{"AI fallback floor"}</Label>
                <Input
                  min={0}
                  max={100}
                  onChange={(event) =>
                    patch({
                      aiFallbackMinConfidence: Math.min(
                        100,
                        Math.max(0, Number(event.target.value) || 0)
                      ),
                    })
                  }
                  type="number"
                  value={settings.aiFallbackMinConfidence}
                />
                <p className="text-xs text-muted-foreground">
                  {"Use 0 to let AI review every uncertain reply."}
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>{"Optional negative examples"}</Label>
                <Textarea
                  className="min-h-32"
                  onChange={(event) =>
                    patch({ negativeKnowledge: event.target.value })
                  }
                  placeholder="One optional example per line"
                  value={settings.negativeKnowledge}
                />
              </div>
              <div className="space-y-2">
                <Label>{"Optional positive examples"}</Label>
                <Textarea
                  className="min-h-32"
                  onChange={(event) =>
                    patch({ positiveKnowledge: event.target.value })
                  }
                  placeholder="One optional example per line"
                  value={settings.positiveKnowledge}
                />
              </div>
            </div>
          </div>
        </details>
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
    <label className="flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border bg-background p-4">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </label>
  )
}
