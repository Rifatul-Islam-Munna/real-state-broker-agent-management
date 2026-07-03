"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type IntegrationHealthResult, useIntegrationHealth } from "@/hooks/use-integration-health"

export function IntegrationHealthPanel() {
  const mutation = useIntegrationHealth()
  const [result, setResult] = useState<IntegrationHealthResult | null>(null)
  const [error, setError] = useState("")

  async function run() {
    setError("")
    const response = await mutation.mutateAsync({})
    if (response.error) return setError(response.error.message)
    if (response.data) setResult(response.data)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{"Live connection status"}</CardTitle>
        <CardDescription>{"Verify saved provider credentials without sending a real message."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button disabled={mutation.isPending} onClick={() => void run()} type="button">
          {mutation.isPending ? "Checking..." : "Test all connections"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {result ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(result.services).map(([key, item]) => (
              <div className="rounded-xl border p-4" key={key}>
                <p className="text-sm font-semibold capitalize">{key}</p>
                <p className="mt-1 text-xs font-medium">{!item.configured ? "Not configured" : item.ok ? "Connected" : "Failed"}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.message}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
