"use client"

import { useEffect, useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  useAgencySettings,
  useUpdateAgencySettings,
} from "@/hooks/use-real-estate-api"
import {
  cloneAgencySettings,
  defaultAgencySettings,
  type AgencyWorkspaceSettings,
} from "@/lib/agency-settings"

import { ShowingFeedbackAutomationSection } from "./showing-feedback-automation-section"

const feedbackTokenPattern =
  /\{\{(?:feedback_summary|feedback\d+|positive_feedback|negative_feedback|positive_summary|negative_summary)\}\}/

function isFollowUpSequence(value?: string) {
  return value === "FollowUp1" || value === "FollowUp2" || value === "FollowUp3"
}

export function ShowingFeedbackAutomationPanel() {
  const query = useAgencySettings()
  const mutation = useUpdateAgencySettings()
  const [values, setValues] = useState<AgencyWorkspaceSettings>(() =>
    cloneAgencySettings(defaultAgencySettings)
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.data) setValues(cloneAgencySettings(query.data))
  }, [query.data])

  const ownerTemplates = useMemo(
    () =>
      values.communicationTemplates.filter(
        (template) =>
          template.audience === "OwnerFeedback" && template.isActive !== false
      ),
    [values.communicationTemplates]
  )
  const followUpTemplates = ownerTemplates.filter(
    (template) => template.id !== values.showingFeedbackAutomation.templateId
  )
  const selectedFollowUps = followUpTemplates.filter((template) =>
    isFollowUpSequence(template.sequenceType)
  )

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
    const automation = values.showingFeedbackAutomation
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
    <section className="space-y-4 scroll-mt-6" id="feedback-automation">
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

      <ShowingFeedbackAutomationSection
        onChange={(showingFeedbackAutomation) => {
          setValues((current) => ({ ...current, showingFeedbackAutomation }))
          setError(null)
        }}
        settings={values.showingFeedbackAutomation}
        templates={values.communicationTemplates}
      />

      <Card className="shadow-none">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Follow-up report templates</CardTitle>
              <CardDescription className="mt-1 max-w-3xl leading-6">
                Select additional Owner Feedback templates. The worker renders
                them with the same weekly feedback batch after the primary report.
                Their sequence type is saved with the template.
              </CardDescription>
            </div>
            <Badge variant="outline">{selectedFollowUps.length} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
          {followUpTemplates.length ? (
            followUpTemplates.map((template) => (
              <label
                className="flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border p-4"
                key={template.id}
              >
                <Checkbox
                  checked={isFollowUpSequence(template.sequenceType)}
                  onCheckedChange={(checked) =>
                    toggleFollowUp(template.id, checked === true)
                  }
                />
                <span>
                  <span className="block text-sm font-semibold">{template.name}</span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {template.subject}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {isFollowUpSequence(template.sequenceType)
                      ? template.sequenceType
                      : "Not in sequence"}
                    {template.gapDays ? ` · ${template.gapDays} day gap` : ""}
                  </span>
                </span>
              </label>
            ))
          ) : (
            <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              Create another active Owner Feedback template to use it as a follow-up.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          className="min-w-44"
          disabled={mutation.isPending || query.isLoading}
          onClick={() => void save()}
          size="lg"
          type="button"
        >
          {mutation.isPending ? "Saving automation..." : "Save automation"}
        </Button>
      </div>
    </section>
  )
}
