"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    if (query.data) setValues(cloneAgencySettings(query.data))
  }, [query.data])

  async function save() {
    const response = await mutation.mutateAsync(values)
    if (response.data) setValues(cloneAgencySettings(response.data))
  }

  return (
    <section className="space-y-4 scroll-mt-6" id="feedback-automation">
      <ShowingFeedbackAutomationSection
        onChange={(showingFeedbackAutomation) =>
          setValues((current) => ({ ...current, showingFeedbackAutomation }))
        }
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
