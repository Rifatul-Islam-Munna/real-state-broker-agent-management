"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import type { AgencySettings } from "@/@types/real-estate-api"
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
  cloneAgencySettings,
  defaultAgencySettings,
} from "@/lib/agency-settings"

import { CommunicationTemplateWorkspaceV2 } from "./communication-template-workspace-v2"
import { SecureIntegrationsSectionV2 } from "./secure-integrations-section-v2"
import {
  ProfileSettingsDialog,
  SchedulingSettingsDialog,
} from "./settings-dialogs-v2"

export function MainContentSectionV2() {
  const settingsQuery = useAgencySettings()
  const updateSettingsMutation = useUpdateAgencySettings()
  const schedulingQuery = useSchedulingSettings()
  const updateSchedulingMutation = useUpdateSchedulingSettings()

  const [values, setValues] = useState<AgencySettings>(() =>
    cloneAgencySettings(defaultAgencySettings),
  )
  const [savedValues, setSavedValues] = useState<AgencySettings>(() =>
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
