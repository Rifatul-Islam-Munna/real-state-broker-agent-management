"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import type { AgencyCommunicationTemplateItem } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  useSchedulingSettings,
  useUpdateSchedulingSettings,
} from "@/hooks/use-scheduling-settings"
import { formatDateTimeLabel } from "@/lib/admin-portal"
import {
  type AgencyWorkspaceSettings,
  cloneAgencySettings,
  defaultAgencySettings,
} from "@/lib/agency-settings"

import { CommunicationTemplateWorkspaceV2 } from "./communication-template-workspace-v2"
import { SecureIntegrationsSectionV2 } from "./secure-integrations-section-v2"
import {
  ProfileSettingsDialog,
  phoneCountryOptions,
  SchedulingSettingsDialog,
} from "./settings-dialogs-v2"

export function MainContentSectionV2() {
  const settingsQuery = useAgencySettings()
  const updateSettingsMutation = useUpdateAgencySettings()
  const schedulingQuery = useSchedulingSettings()
  const updateSchedulingMutation = useUpdateSchedulingSettings()

  const [values, setValues] = useState<AgencyWorkspaceSettings>(() =>
    cloneAgencySettings(defaultAgencySettings),
  )
  const [savedValues, setSavedValues] = useState<AgencyWorkspaceSettings>(() =>
    cloneAgencySettings(defaultAgencySettings),
  )
  const [profileOpen, setProfileOpen] = useState(false)
  const [schedulingOpen, setSchedulingOpen] = useState(false)
  const [timeZone, setTimeZone] = useState("UTC")
  const [morningHour, setMorningHour] = useState(9)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsQuery.data) return
    const next = cloneAgencySettings(settingsQuery.data)
    setValues(next)
    setSavedValues(cloneAgencySettings(next))
  }, [settingsQuery.data])

  useEffect(() => {
    if (!schedulingQuery.data) return
    setTimeZone(schedulingQuery.data.timeZone)
    setMorningHour(schedulingQuery.data.morningOutreachHour)
  }, [schedulingQuery.data])

  const hasChanges = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(savedValues),
    [savedValues, values],
  )
  const templateCounts = useMemo(() => {
    return values.communicationTemplates.reduce(
      (counts, item) => {
        const audience = item.audience ?? "Lead"
        if (audience === "Realtor") counts.realtor++
        else if (audience === "OwnerFeedback") counts.owner++
        else counts.lead++
        return counts
      },
      { lead: 0, owner: 0, realtor: 0 },
    )
  }, [values.communicationTemplates])
  const directLeadTemplates = useMemo(
    () =>
      values.communicationTemplates.filter(
        (template) =>
          template.isActive !== false &&
          (template.audience ?? "Lead") === "Lead" &&
          (template.sequenceType ?? "Direct") === "Direct",
      ),
    [values.communicationTemplates],
  )

  async function saveSettings() {
    setError(null)
    const response = await updateSettingsMutation.mutateAsync(values)
    if (response.error) {
      setError(response.error.message)
      return
    }
    if (!response.data) return

    const next = cloneAgencySettings(response.data)
    setValues(next)
    setSavedValues(cloneAgencySettings(next))
  }

  async function saveScheduling() {
    setError(null)
    const response = await updateSchedulingMutation.mutateAsync({
      morningOutreachHour: morningHour,
      timeZone,
    })
    if (response.error) {
      setError(response.error.message)
      return
    }
    setSchedulingOpen(false)
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-2xl text-foreground">
                {"Workspace settings"}
              </CardTitle>
              <CardDescription className="mt-1 max-w-3xl text-sm leading-6">
                {"Manage profile, timezone, templates, integrations, and team access from compact status cards. Detailed forms open only when needed."}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                disabled={!hasChanges || updateSettingsMutation.isPending}
                onClick={() => {
                  setValues(cloneAgencySettings(savedValues))
                  setError(null)
                }}
                type="button"
                variant="outline"
              >
                {"Discard"}
              </Button>
              <Button
                disabled={!hasChanges || updateSettingsMutation.isPending}
                onClick={() => void saveSettings()}
                type="button"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {settingsQuery.error ? (
          <Alert variant="destructive">
            <AlertDescription>{settingsQuery.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            action="Manage profile"
            badge={values.profile.agencyName ? "Configured" : "Incomplete"}
            description={values.profile.agencyName || "Add agency and contact details"}
            icon="business"
            onClick={() => setProfileOpen(true)}
            title="Agency profile"
          />
          <SummaryCard
            action="Manage scheduling"
            badge={timeZone}
            description={`Daily automation starts at ${String(morningHour).padStart(2, "0")}:00.`}
            icon="schedule"
            onClick={() => setSchedulingOpen(true)}
            title="Scheduling timezone"
          />
          <SummaryCard
            action="Open templates"
            badge={String(values.communicationTemplates.length)}
            description={`${templateCounts.lead} lead, ${templateCounts.realtor} realtor, ${templateCounts.owner} owner report.`}
            icon="mail"
            onClick={() =>
              document
                .getElementById("communication-templates")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            title="Communication templates"
          />
          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
                  <AppIcon name="group" />
                </span>
                <Badge variant="outline">{"Dedicated page"}</Badge>
              </div>
              <CardTitle className="mt-3 text-base text-foreground">
                {"Team and access"}
              </CardTitle>
              <CardDescription className="leading-5">
                {"Manage agents, passwords, status, and route permissions in one focused workspace."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                render={<Link href="/dashboard/team" />}
                variant="outline"
              >
                {"Open team management"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <FirstMessageAutomationPanel
          onChange={(firstMessageAutomation) => {
            setValues((current) => ({ ...current, firstMessageAutomation }))
            setError(null)
          }}
          settings={values.firstMessageAutomation}
        />

        <LeadAutomationPanel
          onChange={(leadAutomation) => {
            setValues((current) => ({ ...current, leadAutomation }))
            setError(null)
          }}
          settings={values.leadAutomation}
          templates={directLeadTemplates}
        />

        <PhoneCountryPanel
          country={values.profile.defaultPhoneCountry || "US"}
          onChange={(defaultPhoneCountry) => {
            setValues((current) => ({
              ...current,
              profile: { ...current.profile, defaultPhoneCountry },
            }))
            setError(null)
          }}
        />

        <LeadKnowledgePanel
          onChange={(leadIntelligence) => {
            setValues((current) => ({ ...current, leadIntelligence }))
            setError(null)
          }}
          settings={values.leadIntelligence}
        />

        <SecureIntegrationsSectionV2 />

        <CommunicationTemplateWorkspaceV2
          onChange={(communicationTemplates) => {
            setValues((current) => ({ ...current, communicationTemplates }))
            setError(null)
          }}
          templates={values.communicationTemplates}
        />

        <p className="text-xs text-muted-foreground">
          {settingsQuery.data?.updatedAt
            ? `Agency settings last saved ${formatDateTimeLabel(settingsQuery.data.updatedAt)}.`
            : "Agency settings have not been saved yet."}
        </p>
      </div>

      <ProfileSettingsDialog
        onChange={(profile) => {
          setValues((current) => ({ ...current, profile }))
          setError(null)
        }}
        onOpenChange={setProfileOpen}
        open={profileOpen}
        profile={values.profile}
      />
      <SchedulingSettingsDialog
        isSaving={updateSchedulingMutation.isPending}
        morningHour={morningHour}
        onMorningHourChange={setMorningHour}
        onOpenChange={setSchedulingOpen}
        onSave={() => void saveScheduling()}
        onTimeZoneChange={setTimeZone}
        open={schedulingOpen}
        timeZone={timeZone}
      />
    </main>
  )
}

function FirstMessageAutomationPanel({
  onChange,
  settings,
}: {
  onChange: (settings: AgencyWorkspaceSettings["firstMessageAutomation"]) => void
  settings: AgencyWorkspaceSettings["firstMessageAutomation"]
}) {
  const patch = (next: Partial<AgencyWorkspaceSettings["firstMessageAutomation"]>) =>
    onChange({ ...settings, ...next })

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-background/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
              <AppIcon name="schedule_send" />
            </span>
            <div>
              <CardTitle className="text-lg">{"Automatic first message"}</CardTitle>
              <CardDescription className="mt-1">
                {"Turn off any first message here. When off, use Send message manually; follow-up still starts after that first manual send."}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            {[settings.lead, settings.leadShowing, settings.realtorShowing].filter(Boolean).length}
            {"/3 auto"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 md:grid-cols-3">
        <FirstMessageToggle
          checked={settings.lead}
          description="New CRM leads get the first lead template automatically."
          label="Lead"
          onChange={(lead) => patch({ lead })}
        />
        <FirstMessageToggle
          checked={settings.leadShowing}
          description="Lead showing first message sends automatically when a Lead Showing template is used."
          label="Lead showing"
          onChange={(leadShowing) => patch({ leadShowing })}
        />
        <FirstMessageToggle
          checked={settings.realtorShowing}
          description="Realtor showing first message sends automatically from the showing workflow."
          label="Realtor showing"
          onChange={(realtorShowing) => patch({ realtorShowing })}
        />
      </CardContent>
    </Card>
  )
}

function FirstMessageToggle({
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
    <label className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border p-4 ${checked ? "border-primary bg-primary/5" : "bg-muted/30"}`}>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          {checked ? "Auto first message on. " : "Manual first message. "}
          {description}
        </span>
      </span>
    </label>
  )
}

function LeadAutomationPanel({
  onChange,
  settings,
  templates,
}: {
  onChange: (settings: AgencyWorkspaceSettings["leadAutomation"]) => void
  settings: AgencyWorkspaceSettings["leadAutomation"]
  templates: AgencyCommunicationTemplateItem[]
}) {
  const selectedTemplate = templates.find((template) => template.id === settings.directTemplateId)
  const selectedTemplateId = selectedTemplate?.id ?? templates[0]?.id ?? "none"
  const channelLabel = settings.channels.join(" + ") || "No channel"
  const patch = (next: Partial<AgencyWorkspaceSettings["leadAutomation"]>) =>
    onChange({
      ...settings,
      ...next,
      channels: next.channels?.length ? next.channels : settings.channels.length ? settings.channels : ["Email"],
    })
  const toggleChannel = (channel: "Email" | "SMS", checked: boolean) => {
    const channels = checked
      ? Array.from(new Set([...settings.channels, channel]))
      : settings.channels.filter((item) => item !== channel)
    patch({ channels: channels.length ? channels : [channel] })
  }

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-background/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-primary/10 text-primary">
              <AppIcon name="send" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{"Lead automation"}</CardTitle>
                <Badge variant={settings.enabled ? "secondary" : "outline"}>
                  {settings.enabled ? "Enabled" : "Paused"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                {"Auto-send the first lead message, then stop pending automation when the lead replies."}
              </CardDescription>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-72">
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="block text-muted-foreground">{"Channels"}</span>
              <strong>{channelLabel}</strong>
            </div>
            <div className="rounded-lg border bg-muted/30 px-3 py-2">
              <span className="block text-muted-foreground">{"Follow-up"}</span>
              <strong>{settings.followUpEnabled ? "Queued" : "Off"}</strong>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(280px,1.4fr)_minmax(260px,1fr)]">
        <label
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors ${settings.enabled ? "border-primary bg-primary/5" : "bg-muted/30"}`}
        >
          <span>
            <span className="block text-sm font-semibold">{"Auto-send for new leads"}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{settings.enabled ? "New leads get the default template." : "No automatic lead message sends."}</span>
          </span>
          <Checkbox checked={settings.enabled} onCheckedChange={(checked) => patch({ enabled: checked === true })} />
        </label>
        <div className="rounded-xl border bg-background p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{"Default direct template"}</Label>
            <Badge variant="outline">{"Lead"}</Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Select
              onValueChange={(value) => value !== "none" && patch({ directTemplateId: value })}
              value={selectedTemplateId}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose lead template" /></SelectTrigger>
              <SelectContent>
                {!templates.length ? <SelectItem value="none">{"No direct lead template"}</SelectItem> : null}
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                document
                  .getElementById("communication-templates")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              type="button"
              variant="outline"
            >
              {"Templates"}
            </Button>
          </div>
          <p className={`mt-2 text-xs ${templates.length ? "text-muted-foreground" : "text-destructive"}`}>
            {templates.length
              ? (selectedTemplate?.subject || "This template is used first.")
              : "Create one active Lead / Direct template first."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex min-h-12 items-center gap-2 rounded-xl border bg-background p-3 text-sm font-semibold">
            <Checkbox checked={settings.channels.includes("Email")} onCheckedChange={(checked) => toggleChannel("Email", checked === true)} />
            {"Email"}
          </label>
          <label className="flex min-h-12 items-center gap-2 rounded-xl border bg-background p-3 text-sm font-semibold">
            <Checkbox checked={settings.channels.includes("SMS")} onCheckedChange={(checked) => toggleChannel("SMS", checked === true)} />
            {"SMS"}
          </label>
          <label className="col-span-2 flex min-h-12 items-center gap-2 rounded-xl border bg-background p-3 text-sm font-semibold">
            <Checkbox checked={settings.followUpEnabled} onCheckedChange={(checked) => patch({ followUpEnabled: checked === true })} />
            {"Queue follow-up templates"}
          </label>
        </div>
      </CardContent>
    </Card>
  )
}

function PhoneCountryPanel({
  country,
  onChange,
}: {
  country: string
  onChange: (country: string) => void
}) {
  const selected = phoneCountryOptions.find(([value]) => value === country) ?? phoneCountryOptions[0]

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-background/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-blue-50 text-blue-700">
              <AppIcon name="phone" />
            </span>
            <div>
              <CardTitle className="text-lg">{"Phone country"}</CardTitle>
              <CardDescription className="mt-1">
                {"Local numbers use this country before SMS sends. Example: 754-223-9582 becomes +1... for United States."}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{selected[1]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(260px,420px)_1fr] md:items-center">
        <Select onValueChange={onChange} value={country}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {phoneCountryOptions.map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs leading-5 text-muted-foreground">
          {"Email-only leads skip SMS. Phone-only leads skip email. Each channel sends only when that contact exists."}
        </p>
      </CardContent>
    </Card>
  )
}

function LeadKnowledgePanel({
  onChange,
  settings,
}: {
  onChange: (settings: AgencyWorkspaceSettings["leadIntelligence"]) => void
  settings: AgencyWorkspaceSettings["leadIntelligence"]
}) {
  const patch = (next: Partial<AgencyWorkspaceSettings["leadIntelligence"]>) =>
    onChange({ ...settings, ...next })

  return (
    <Card className="overflow-hidden shadow-none">
      <CardHeader className="border-b bg-background/70">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-emerald-50 text-emerald-700">
              <AppIcon name="tune" />
            </span>
            <div>
              <CardTitle className="text-lg">{"Lead knowledge"}</CardTitle>
              <CardDescription className="mt-1">
                {"Contact forms and inbox-created leads use this before placing leads on the board."}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{`${settings.learnedUnqualified.length} learned corrections`}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold">{"Qualified / board-worthy"}</span>
          <Textarea
            className="min-h-36"
            onChange={(event) => patch({ qualifiedKnowledge: event.target.value })}
            value={settings.qualifiedKnowledge}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">{"Not a real lead / keep out"}</span>
          <Textarea
            className="min-h-36"
            onChange={(event) => patch({ unqualifiedKnowledge: event.target.value })}
            value={settings.unqualifiedKnowledge}
          />
        </label>
      </CardContent>
    </Card>
  )
}

function SummaryCard({
  action,
  badge,
  description,
  icon,
  onClick,
  title,
}: {
  action: string
  badge: string
  description: string
  icon: string
  onClick: () => void
  title: string
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
            <AppIcon name={icon} />
          </span>
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <CardTitle className="mt-3 text-base text-foreground">{title}</CardTitle>
        <CardDescription className="leading-5">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" onClick={onClick} type="button" variant="outline">
          {action}
        </Button>
      </CardContent>
    </Card>
  )
}
