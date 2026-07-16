"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useLeadOutreachTemplates } from "@/hooks/use-lead-outreach-api"
import {
  useRealtorShowings,
  useSendRealtorShowingMessage,
  useUpdateRealtorShowingAutomation,
  useUpdateRealtorShowingProperty,
} from "@/hooks/use-realtor-showings-api"
import { useProperties } from "@/hooks/use-real-estate-api"
import { useSchedulingSettings } from "@/hooks/use-scheduling-settings"
import {
  formatDateTimeInZone,
  toDateTimeLocalInZone,
} from "@/lib/time-zone"

import {
  RealtorShowingAutomationSheetV2,
  type ShowingAutomationEditor,
} from "./realtor-showing-automation-sheet-v2"
import { RealtorShowingEntryDialogsV2 } from "./realtor-showing-entry-dialogs-v2"

export function RealtorShowingsPageV2() {
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [automationEditor, setAutomationEditor] =
    useState<ShowingAutomationEditor | null>(null)

  const showingsQuery = useRealtorShowings(search)
  const propertiesQuery = useProperties({ page: 1, pageSize: 200 })
  const templatesQuery = useLeadOutreachTemplates()
  const schedulingQuery = useSchedulingSettings()
  const propertyMutation = useUpdateRealtorShowingProperty()
  const automationMutation = useUpdateRealtorShowingAutomation()
  const sendMessageMutation = useSendRealtorShowingMessage()

  const rawShowings = showingsQuery.data
  const showings = Array.isArray(rawShowings)
    ? rawShowings
    : rawShowings?.items ?? []
  const totalShowings = Array.isArray(rawShowings)
    ? rawShowings.length
    : rawShowings?.totalCount ?? showings.length
  const properties = propertiesQuery.data?.items ?? []
  const timeZone = schedulingQuery.data?.timeZone ?? "UTC"
  const templates = useMemo(
    () =>
      (templatesQuery.data ?? []).filter(
        (template) =>
          template.isActive !== false &&
          (template.audience === "Realtor" ||
            template.audience === "LeadShowing" ||
            template.id === "showing-confirmation"),
      ),
    [templatesQuery.data],
  )
  const directTemplates = useMemo(
    () =>
      templates.filter(
        (template) => (template.sequenceType ?? "Direct") === "Direct",
      ),
    [templates],
  )
  const followUpTemplates = useMemo(
    () =>
      templates.filter(
        (template) => (template.sequenceType ?? "Direct") !== "Direct",
      ),
    [templates],
  )
  const matchedCount = showings.filter((item) => item.propertyId).length
  const scheduledCount = showings.filter(
    (item) => item.automationStatus === "Scheduled",
  ).length
  const stoppedCount = showings.filter(
    (item) => item.automationStatus === "StoppedByReply",
  ).length

  async function saveAutomation() {
    if (!automationEditor) return
    const response = await automationMutation.mutateAsync(automationEditor)
    if (!response.error) setAutomationEditor(null)
  }

  return (
    <main className="min-h-full bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <Card className="shadow-none">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl text-foreground">
                  {"Realtor showings"}
                </CardTitle>
                <Badge variant="outline">{timeZone}</Badge>
              </div>
              <CardDescription className="mt-2 max-w-3xl leading-6">
                {"Add one showing or import mapped CSV rows, match properties, and schedule realtor email/SMS follow-ups. Replies stop remaining automation."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                render={<Link href="/dashboard/settings#communication-templates" />}
                variant="outline"
              >
                {"Manage templates"}
              </Button>
              <Button
                onClick={() => setImportOpen(true)}
                type="button"
                variant="outline"
              >
                <AppIcon name="upload_file" />
                {"Import CSV"}
              </Button>
              <Button render={<Link href="/dashboard/realtor-showings/new" />} type="button">
                <AppIcon name="add" />
                {"Add showing"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric icon="event" label="Total showings" value={totalShowings} />
          <Metric icon="home_work" label="Matched properties" value={matchedCount} />
          <Metric icon="schedule_send" label="Automation scheduled" value={scheduledCount} />
          <Metric icon="mark_email_read" label="Stopped by reply" value={stoppedCount} />
        </section>

        <Card className="shadow-none">
          <CardHeader className="grid gap-4 md:grid-cols-[1fr_320px] md:items-end">
            <div>
              <CardTitle className="text-base text-foreground">
                {"Showing registry"}
              </CardTitle>
              <CardDescription>
                {"Use the property selector to correct automatic matches. Edit scheduling in the side sheet."}
              </CardDescription>
            </div>
            <div className="relative">
              <AppIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                name="search"
              />
              <Input
                className="pl-9"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search realtor, property, email, or phone"
                value={search}
              />
            </div>
          </CardHeader>
          <CardContent>
            {showingsQuery.isLoading ? (
              <p className="py-14 text-center text-sm text-muted-foreground">
                {"Loading showings..."}
              </p>
            ) : showingsQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>{showingsQuery.error.message}</AlertDescription>
              </Alert>
            ) : showings.length === 0 ? (
              <div className="rounded-xl border border-dashed py-14 text-center text-sm text-muted-foreground">
                {"No realtor showings match the current search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1050px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{"Realtor"}</TableHead>
                      <TableHead>{"Showing"}</TableHead>
                      <TableHead>{"Property match"}</TableHead>
                      <TableHead>{"Delivery"}</TableHead>
                      <TableHead>{"Automation"}</TableHead>
                      <TableHead className="text-right">{"Action"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showings.map((showing) => (
                      <TableRow key={showing.id}>
                        <TableCell className="max-w-[230px]">
                          <p className="font-medium text-foreground">
                            {showing.realtorName || "Realtor"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {showing.realtorEmail || showing.realtorPhone || "No contact"}
                          </p>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-foreground">
                          {showing.showingAt
                            ? formatDateTimeInZone(showing.showingAt, timeZone)
                            : "Not provided"}
                        </TableCell>
                        <TableCell className="min-w-[300px]">
                          <Select
                            disabled={propertyMutation.isPending}
                            onValueChange={(value) =>
                              void propertyMutation.mutateAsync({
                                id: showing.id,
                                propertyId:
                                  value === "none" ? null : Number(value),
                              })
                            }
                            value={
                              showing.propertyId
                                ? String(showing.propertyId)
                                : "none"
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose property" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{"Unmatched"}</SelectItem>
                              {properties.map((property) => (
                                <SelectItem
                                  key={property.id}
                                  value={String(property.id)}
                                >
                                  {`${property.title} — ${property.location}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge
                              variant={
                                showing.propertyId ? "secondary" : "destructive"
                              }
                            >
                              {showing.propertyMatchMethod}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {`${Math.round(showing.propertyMatchScore * 100)}% match`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {showing.emailEnabled ? (
                              <Badge variant="outline">{"Email"}</Badge>
                            ) : null}
                            {showing.smsEnabled ? (
                              <Badge variant="outline">{"SMS"}</Badge>
                            ) : null}
                            {showing.followUpEnabled ? (
                              <Badge variant="outline">
                                {`Follow-up ${showing.followUpGapDays}d`}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {showing.outreachAt
                              ? formatDateTimeInZone(showing.outreachAt, timeZone)
                              : "Send immediately"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              showing.automationStatus === "StoppedByReply"
                                ? "secondary"
                                : showing.automationStatus === "Scheduled"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {showing.automationStatus === "StoppedByReply"
                              ? "Stopped: replied"
                              : showing.automationStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {showing.automationStatus === "NotScheduled" &&
                            (showing.emailEnabled || showing.smsEnabled) ? (
                              <Button
                                disabled={sendMessageMutation.isPending}
                                onClick={() =>
                                  void sendMessageMutation.mutateAsync({
                                    id: showing.id,
                                  })
                                }
                                size="sm"
                                type="button"
                              >
                                <AppIcon name="send" />
                                {"Send message"}
                              </Button>
                            ) : null}
                            <Button
                              onClick={() =>
                                setAutomationEditor({
                                  directTemplateId: showing.directTemplateId,
                                  emailEnabled: showing.emailEnabled,
                                  followUpEnabled: showing.followUpEnabled,
                                  followUpGapDays: showing.followUpGapDays,
                                  followUpTemplateId: showing.followUpTemplateId,
                                  id: showing.id,
                                  outreachAt: toDateTimeLocalInZone(
                                    showing.outreachAt,
                                    timeZone,
                                  ),
                                  realtorName: showing.realtorName,
                                  smsEnabled: showing.smsEnabled,
                                })
                              }
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {"Edit schedule"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RealtorShowingEntryDialogsV2
        directTemplates={directTemplates}
        followUpTemplates={followUpTemplates}
        importOpen={importOpen}
        manualOpen={false}
        onImportOpenChange={setImportOpen}
        onManualOpenChange={() => undefined}
        properties={properties}
        timeZone={timeZone}
      />
      <RealtorShowingAutomationSheetV2
        directTemplates={directTemplates}
        editor={automationEditor}
        followUpTemplates={followUpTemplates}
        isSaving={automationMutation.isPending}
        onChange={setAutomationEditor}
        onClose={() => setAutomationEditor(null)}
        onSave={() => void saveAutomation()}
        timeZone={timeZone}
      />
    </main>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: string
  label: string
  value: number
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
          <AppIcon name={icon} />
        </span>
      </CardContent>
    </Card>
  )
}
