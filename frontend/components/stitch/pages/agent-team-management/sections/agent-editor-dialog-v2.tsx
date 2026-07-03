"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { agentRouteAccessItems } from "@/lib/agent-route-access"

import {
  type AccessMode,
  type AgentFormErrors,
  type AgentFormValues,
  validateAgentValues,
} from "./agent-team-shared"

function FieldError({ error }: { error?: string }) {
  return error ? <p className="text-xs font-medium text-destructive">{error}</p> : null
}

function AgentAccessFields({
  errors,
  onAccessModeChange,
  onTogglePermission,
  values,
}: {
  errors: AgentFormErrors
  onAccessModeChange: (value: AccessMode) => void
  onTogglePermission: (permission: string) => void
  values: AgentFormValues
}) {
  return (
    <Card className="md:col-span-2" size="sm">
      <CardHeader>
        <CardTitle>{"Permission access"}</CardTitle>
        <CardDescription>
          {"Choose full portal access or limit the agent to selected dashboard routes."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          <Label>{"Access mode"}</Label>
          <Select
            modal={false}
            onValueChange={(value) => onAccessModeChange(value as AccessMode)}
            value={values.accessMode}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select access mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">{"Full agent portal"}</SelectItem>
              <SelectItem value="custom">{"Custom route access"}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {values.accessMode === "custom" ? (
          <div className="space-y-3">
            <Label>{"Allowed routes"}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {agentRouteAccessItems.map((item) => {
                const checked = values.agentRoutePermissions.includes(item.permission)

                return (
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 hover:bg-muted/35"
                    key={item.permission}
                  >
                    <Checkbox
                      checked={checked}
                      className="mt-0.5"
                      onCheckedChange={() => onTogglePermission(item.permission)}
                    />
                    <span>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            <FieldError error={errors.agentRoutePermissions} />
          </div>
        ) : (
          <div className="flex items-center rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            {"This agent can open every current agent portal route."}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AgentEditorDialog({
  initialFormValues,
  isSubmitting,
  mode,
  onClose,
  onSubmit,
  open,
}: {
  initialFormValues: AgentFormValues
  isSubmitting: boolean
  mode: "create" | "edit"
  onClose: () => void
  onSubmit: (values: AgentFormValues) => Promise<string | null>
  open: boolean
}) {
  const [values, setValues] = useState<AgentFormValues>(initialFormValues)
  const [errors, setErrors] = useState<AgentFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setValues(initialFormValues)
    setErrors({})
    setSubmitError(null)
  }, [initialFormValues, open])

  function setField<K extends keyof AgentFormValues>(
    key: K,
    value: AgentFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
    setSubmitError(null)
  }

  function togglePermission(permission: string) {
    setValues((current) => ({
      ...current,
      agentRoutePermissions: current.agentRoutePermissions.includes(permission)
        ? current.agentRoutePermissions.filter((item) => item !== permission)
        : [...current.agentRoutePermissions, permission],
    }))
    setErrors((current) => ({
      ...current,
      agentRoutePermissions: undefined,
      form: undefined,
    }))
    setSubmitError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : undefined)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create agent" : "Edit agent"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new agent, login status, profile details, and route permissions."
              : "Update the agent profile, login status, and route permissions."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault()
            const nextErrors = validateAgentValues(values, mode)

            if (Object.keys(nextErrors).length > 0) {
              setErrors(nextErrors)
              return
            }

            const error = await onSubmit(values)
            if (error) {
              setSubmitError(error)
              return
            }

            onClose()
          }}
        >
          <div className="grid max-h-[62vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="agent-first-name">{"First name"}</Label>
              <Input
                id="agent-first-name"
                onChange={(event) => setField("firstName", event.target.value)}
                value={values.firstName}
              />
              <FieldError error={errors.firstName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-last-name">{"Last name"}</Label>
              <Input
                id="agent-last-name"
                onChange={(event) => setField("lastName", event.target.value)}
                value={values.lastName}
              />
              <FieldError error={errors.lastName} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-email">{"Email"}</Label>
              <Input
                id="agent-email"
                onChange={(event) => setField("email", event.target.value)}
                type="email"
                value={values.email}
              />
              <FieldError error={errors.email} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-password">{"Password"}</Label>
              <Input
                id="agent-password"
                onChange={(event) => setField("password", event.target.value)}
                placeholder={
                  mode === "create" ? "Temporary password" : "New password (optional)"
                }
                type="password"
                value={values.password}
              />
              <FieldError error={errors.password} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-phone">{"Phone"}</Label>
              <Input
                id="agent-phone"
                onChange={(event) => setField("phone", event.target.value)}
                value={values.phone}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-agency">{"Team / agency"}</Label>
              <Input
                id="agent-agency"
                onChange={(event) => setField("agencyName", event.target.value)}
                value={values.agencyName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-license">{"License number"}</Label>
              <Input
                id="agent-license"
                onChange={(event) => setField("licenseNumber", event.target.value)}
                value={values.licenseNumber}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-commission">{"Commission rate"}</Label>
              <Input
                id="agent-commission"
                onChange={(event) => setField("commissionRate", event.target.value)}
                value={values.commissionRate}
              />
              <FieldError error={errors.commissionRate} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="agent-avatar">{"Avatar URL"}</Label>
              <Input
                id="agent-avatar"
                onChange={(event) => setField("avatarUrl", event.target.value)}
                value={values.avatarUrl}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="agent-bio">{"Short bio"}</Label>
              <Textarea
                id="agent-bio"
                onChange={(event) => setField("bio", event.target.value)}
                value={values.bio}
              />
            </div>

            <AgentAccessFields
              errors={errors}
              onAccessModeChange={(value) => setField("accessMode", value)}
              onTogglePermission={togglePermission}
              values={values}
            />

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold">
              <Checkbox
                checked={values.isVerifiedAgent}
                onCheckedChange={(checked) =>
                  setField("isVerifiedAgent", Boolean(checked))
                }
              />
              {"Verified agent"}
            </label>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-semibold">
              <Checkbox
                checked={values.isActive}
                onCheckedChange={(checked) => setField("isActive", Boolean(checked))}
              />
              {"Active account"}
            </label>
          </div>

          {submitError ? (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter className="mx-0 mb-0 rounded-xl">
            <Button onClick={onClose} type="button" variant="outline">
              {"Close"}
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create agent"
                  : "Save agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
