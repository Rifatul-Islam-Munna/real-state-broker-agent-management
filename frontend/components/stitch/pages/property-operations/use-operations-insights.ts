"use client"

import { useEffect, useState } from "react"
import { propertyOperationsApi } from "@/lib/property-operations-api"

export function useOperationsInsights() {
  const [assistant, setAssistant] = useState<Record<string, unknown> | null>(null)
  const [activities, setActivities] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState("")

  async function refresh() {
    try {
      const [assistantData, activityData] = await Promise.all([
        propertyOperationsApi.getAssistant(),
        propertyOperationsApi.getActivity(),
      ])
      setAssistant(assistantData)
      setActivities(activityData)
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not load operational insights.")
    }
  }

  useEffect(() => { void refresh() }, [])
  return { activities, assistant, error, refresh }
}
