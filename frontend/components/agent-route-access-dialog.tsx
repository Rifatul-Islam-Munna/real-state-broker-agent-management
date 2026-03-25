"use client"

import { useEffect, useState } from "react"

import type { AgentUserOption, UpdateAgentRoutePermissionsInput } from "@/@types/real-estate-api"
import { agentRouteAccessItems } from "@/lib/agent-route-access"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { AppIcon } from "@/components/ui/app-icon"

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
    if (!agent || !open) {
      return
    }

    setSelectedPermissions(agent.agentRoutePermissions ?? [])
    setUseCustomAccess(agent.hasCustomAgentRoutePermissions ?? false)
    setSubmitError(null)
  }, [agent, open])

  if (!agent) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0">
        <div className="border-b border-slate-200 px-6 py-5">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
            {"Agent Route Access"}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-slate-500">
            {`Choose which agent portal routes ${agent.fullName} can open. Admin access stays unrestricted.`}
          </DialogDescription>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              className={`rounded-2xl border px-5 py-4 text-left transition-colors ${
                !useCustomAccess
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => {
                setUseCustomAccess(false)
                setSubmitError(null)
              }}
              type="button"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em]">
                {"Full Access"}
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Agent can open every current agent route."}
              </p>
            </button>

            <button
              className={`rounded-2xl border px-5 py-4 text-left transition-colors ${
                useCustomAccess
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => {
                setUseCustomAccess(true)
                setSubmitError(null)
              }}
              type="button"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em]">
                {"Custom Access"}
              </p>
              <p className="mt-2 text-sm leading-6">
                {"Admin picks exactly which agent portal routes stay visible and usable."}
              </p>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {agentRouteAccessItems.map((item) => {
              const isChecked = selectedPermissions.includes(item.permission)

              return (
                <label
                  key={item.permission}
                  className={`flex items-start gap-4 rounded-2xl border px-5 py-4 ${
                    useCustomAccess
                      ? "border-slate-200 bg-slate-50"
                      : "border-slate-100 bg-slate-50/60 opacity-70"
                  }`}
                >
                  <input
                    checked={isChecked}
                    className="mt-1 rounded border-slate-300 text-primary focus:ring-primary"
                    disabled={!useCustomAccess}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSelectedPermissions((current) =>
                        checked
                          ? [...current, item.permission]
                          : current.filter((permission) => permission !== item.permission),
                      )
                      setSubmitError(null)
                    }}
                    type="checkbox"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <AppIcon className="text-lg text-primary" name={item.icon} />
                      <p className="text-sm font-bold text-slate-900">
                        {item.label}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {item.href}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>

          {submitError ? (
            <p className="text-sm font-semibold text-rose-600">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            {"Close"}
          </button>
          <button
            className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
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
            {isSubmitting ? "Saving..." : "Save Access"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
