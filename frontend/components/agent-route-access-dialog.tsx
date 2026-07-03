"use client"

import { useEffect, useState } from "react"

import type { AgentUserOption, UpdateAgentRoutePermissionsInput } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { agentRouteAccessItems } from "@/lib/agent-route-access"

type AgentRouteAccessDialogProps = {
  agent: AgentUserOption | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: UpdateAgentRoutePermissionsInput) => Promise<string | null>
  open: boolean
}

export function AgentRouteAccessDialog({
  agent,
  isSubmitting,
  onOpenChange,
  onSubmit,
  open,
}: AgentRouteAccessDialogProps) {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [useCustomAccess, setUseCustomAccess] = useState(false)

  useEffect(() => {
    if (!agent || !open) return

    setSelectedPermissions(agent.agentRoutePermissions ?? [])
    setUseCustomAccess(agent.hasCustomAgentRoutePermissions ?? false)
    setSubmitError(null)
  }, [agent, open])

  if (!agent) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{"Agent route access"}</DialogTitle>
          <DialogDescription>
            {`Choose which dashboard routes ${agent.fullName} can open. Admin access stays unrestricted.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              className="h-auto items-start justify-start p-4 text-left"
              onClick={() => {
                setUseCustomAccess(false)
                setSubmitError(null)
              }}
              type="button"
              variant={!useCustomAccess ? "default" : "outline"}
            >
              <span>
                <span className="block font-semibold">{"Full access"}</span>
                <span className="mt-1 block text-xs font-normal opacity-75">
                  {"Agent can open every current agent route."}
                </span>
              </span>
            </Button>

            <Button
              className="h-auto items-start justify-start p-4 text-left"
              onClick={() => {
                setUseCustomAccess(true)
                setSubmitError(null)
              }}
              type="button"
              variant={useCustomAccess ? "default" : "outline"}
            >
              <span>
                <span className="block font-semibold">{"Custom access"}</span>
                <span className="mt-1 block text-xs font-normal opacity-75">
                  {"Choose exactly which dashboard routes remain visible."}
                </span>
              </span>
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {agentRouteAccessItems.map((item) => {
              const isChecked = selectedPermissions.includes(item.permission)

              return (
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                    useCustomAccess
                      ? "bg-card hover:bg-muted/35"
                      : "cursor-not-allowed bg-muted/35 opacity-60"
                  }`}
                  key={item.permission}
                >
                  <Checkbox
                    checked={isChecked}
                    className="mt-0.5"
                    disabled={!useCustomAccess}
                    onCheckedChange={(checked) => {
                      setSelectedPermissions((current) =>
                        checked
                          ? [...current, item.permission]
                          : current.filter((permission) => permission !== item.permission),
                      )
                      setSubmitError(null)
                    }}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold">
                      <AppIcon className="text-primary" name={item.icon} />
                      {item.label}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {item.href}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>

          {submitError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            {"Close"}
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={async () => {
              if (useCustomAccess && selectedPermissions.length === 0) {
                setSubmitError("Select at least one route for custom access.")
                return
              }

              const error = await onSubmit({
                agentId: agent.id,
                agentRoutePermissions: selectedPermissions,
                useCustomAgentRoutePermissions: useCustomAccess,
              })

              if (error) {
                setSubmitError(error)
                return
              }

              onOpenChange(false)
            }}
            type="button"
          >
            {isSubmitting ? "Saving..." : "Save access"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
