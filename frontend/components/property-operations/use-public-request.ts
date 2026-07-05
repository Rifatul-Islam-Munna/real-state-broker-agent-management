"use client"

import { useEffect, useState } from "react"
import { propertyOperationsApi, type PublicOperationsRequest } from "@/lib/property-operations-api"

export function usePublicRequest(token: string) {
  const [request, setRequest] = useState<PublicOperationsRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  useEffect(() => {
    propertyOperationsApi.getPublicRequest(token).then(setRequest).catch((value) => setError(value instanceof Error ? value.message : "Unavailable")).finally(() => setLoading(false))
  }, [token])
  return { error, loading, request }
}
