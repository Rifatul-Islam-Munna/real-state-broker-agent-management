"use client"

import { useEffect, useState } from "react"
import { propertyOperationsApi, type PublicOperationsRequest } from "@/lib/property-operations-api"

export function usePublicRequest(token: string) {
  const [request, setRequest] = useState<PublicOperationsRequest | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [accepted, setAccepted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    propertyOperationsApi.getPublicRequest(token).then(setRequest).catch((value) => setError(value instanceof Error ? value.message : "Unavailable")).finally(() => setLoading(false))
  }, [token])
  async function submit() {
    if (request?.termsText && !accepted) return
    setLoading(true)
    try {
      await propertyOperationsApi.submitPublicRequest(token, { responderName: String(answers.name ?? ""), responderEmail: String(answers.email ?? ""), responderPhone: String(answers.phone ?? ""), notes: String(answers.notes ?? ""), responseJson: JSON.stringify(answers), attachmentUrlsJson: "[]" })
      setSubmitted(true)
    } catch (value) { setError(value instanceof Error ? value.message : "Submission failed") }
    finally { setLoading(false) }
  }
  return { accepted, answers, error, loading, request, setAccepted, setAnswers, submit, submitted }
}
