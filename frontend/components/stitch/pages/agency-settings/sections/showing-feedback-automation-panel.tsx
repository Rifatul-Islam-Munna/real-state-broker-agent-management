"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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

  async function save() {
    setError(null)
    const automation = values.showingFeedbackAutomation
    const selectedTemplate = values.communicationTemplates.find(
      (template) =>
        template.id === automation.templateId &&
        template.audience === "OwnerFeedback" &&
        template.isActive !== false
    )
    if (automation.enabled && !selectedTemplate) {
      setError("Choose an active owner feedback template before enabling automation.")
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
