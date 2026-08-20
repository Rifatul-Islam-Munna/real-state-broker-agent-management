"use client"

import { useEffect, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useUpdateAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"

type Values = {
  providerName: "Twilio" | "Plivo" | "RingCentral" | "Custom"
  accountId: string
  clientSecret: string
  authToken: string
  fromNumber: string
  baseUrl: string
  voiceWebhookUrl: string
  smsWebhookUrl: string
  supportsSms: boolean
  supportsVoice: boolean
  enableSmsSync: boolean
  syncIntervalMinutes: string
  maxMessagesPerSync: string
  localSmsRetentionDays: string
  hasAuthToken: boolean
  hasClientSecret: boolean
}

const emptyValues = (): Values => ({
  providerName: "Twilio",
  accountId: "",
  clientSecret: "",
  authToken: "",
  fromNumber: "",
  baseUrl: "https://api.twilio.com",
  voiceWebhookUrl: "",
  smsWebhookUrl: "/api/sms-webhooks/twilio",
  supportsSms: true,
  supportsVoice: true,
  enableSmsSync: false,
  syncIntervalMinutes: "5",
  maxMessagesPerSync: "25",
  localSmsRetentionDays: "0",
  hasAuthToken: false,
  hasClientSecret: false,
})

export function IntegrationCommunicationSheet({
  config,
  onOpenChange,
  open,
}: {
  config?: Partial<Values> | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const mutation = useUpdateAgencyIntegrationSettings()
  const [values, setValues] = useState<Values>(() => emptyValues())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const defaults = emptyValues()
    setValues({
      ...defaults,
      ...config,
      authToken: "",
      clientSecret: "",
      syncIntervalMinutes: String(config?.syncIntervalMinutes ?? defaults.syncIntervalMinutes),
      maxMessagesPerSync: String(config?.maxMessagesPerSync ?? defaults.maxMessagesPerSync),
      localSmsRetentionDays: String(config?.localSmsRetentionDays ?? defaults.localSmsRetentionDays),
    })
    setError(null)
  }, [config, open])

  function patch(update: Partial<Values>) {
    setValues((current) => ({ ...current, ...update }))
  }

  function changeProvider(providerName: Values["providerName"]) {
    const preset =
      providerName === "Plivo"
        ? { baseUrl: "https://api.plivo.com", smsWebhookUrl: "/api/sms-webhooks/plivo" }
        : providerName === "RingCentral"
          ? { baseUrl: "https://platform.ringcentral.com", smsWebhookUrl: "", voiceWebhookUrl: "", supportsSms: true, supportsVoice: false, enableSmsSync: true }
          : providerName === "Twilio"
            ? { baseUrl: "https://api.twilio.com", smsWebhookUrl: "/api/sms-webhooks/twilio" }
            : {}
    patch({ providerName, ...preset })
  }

  async function save() {
    setError(null)
    const isRingCentral = values.providerName === "RingCentral"
    if (!values.accountId.trim() || !values.fromNumber.trim()) {
      setError(`${isRingCentral ? "Client ID" : "Account ID"} and from number are required.`)
      return
    }
    if (isRingCentral && !values.clientSecret.trim() && !values.hasClientSecret) {
      setError("RingCentral client secret is required for a new connection.")
      return
    }
    if (!values.authToken.trim() && !values.hasAuthToken) {
      setError(`${isRingCentral ? "RingCentral JWT" : "Auth token"} is required for a new connection.`)
      return
    }
    const response = await mutation.mutateAsync({
      communication: {
        providerName: values.providerName,
        accountId: values.accountId.trim(),
        clientSecret: values.clientSecret.trim(),
        authToken: values.authToken.trim(),
        fromNumber: values.fromNumber.trim(),
        baseUrl: values.baseUrl.trim() || null,
        voiceWebhookUrl: values.voiceWebhookUrl.trim() || null,
        smsWebhookUrl: values.smsWebhookUrl.trim() || null,
        supportsSms: values.supportsSms,
        supportsVoice: values.supportsVoice,
        enableSmsSync: values.enableSmsSync,
        syncIntervalMinutes: Math.max(1, Number(values.syncIntervalMinutes) || 5),
        maxMessagesPerSync: Math.max(5, Number(values.maxMessagesPerSync) || 25),
        localSmsRetentionDays: Math.max(0, Number(values.localSmsRetentionDays) || 0),
      },
    })
    if (response.error) {
      setError(response.error.message)
      return
    }
    onOpenChange(false)
  }

  async function disconnect() {
    setError(null)
    const response = await mutation.mutateAsync({ clearCommunication: true })
    if (response.error) {
      setError(response.error.message)
      return
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="shadow-none sm:w-[36rem] sm:max-w-[36rem]">
        <SheetHeader className="border-b">
          <SheetTitle>{"Calls and SMS"}</SheetTitle>
          <SheetDescription>
            {"Existing secrets are never returned. Leave the token blank to keep the saved token."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Field label="Provider">
            <Select onValueChange={(value) => changeProvider(value as Values["providerName"])} value={values.providerName}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Twilio">{"Twilio"}</SelectItem>
                <SelectItem value="Plivo">{"Plivo"}</SelectItem>
                <SelectItem value="RingCentral">{"RingCentral"}</SelectItem>
                <SelectItem value="Custom">{"Custom"}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {values.providerName === "RingCentral" ? (
            <Alert>
              <AlertDescription>
                Paste RC_CLIENT_ID, RC_CLIENT_SECRET, RC_JWT, RC_FROM_NUMBER, and RC_SERVER_URL below. SDK exchanges saved JWT for an access token on each sync or send. Automatic polling needs no webhook and does not mark RingCentral messages read.
              </AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={values.providerName === "RingCentral" ? "Client ID (RC_CLIENT_ID)" : "Account / client ID"}><Input autoComplete="off" onChange={(event) => patch({ accountId: event.target.value })} value={values.accountId} /></Field>
            {values.providerName === "RingCentral" ? <Field label={values.hasClientSecret ? "Client secret (saved)" : "Client secret (RC_CLIENT_SECRET)"}><Input autoComplete="new-password" onChange={(event) => patch({ clientSecret: event.target.value })} placeholder={values.hasClientSecret ? "Leave blank to keep saved secret" : "Paste RC_CLIENT_SECRET"} type="password" value={values.clientSecret} /></Field> : null}
            <Field label={values.providerName === "RingCentral" ? (values.hasAuthToken ? "JWT (saved)" : "JWT (RC_JWT)") : (values.hasAuthToken ? "Auth token (saved)" : "Auth token")}><Input autoComplete="new-password" onChange={(event) => patch({ authToken: event.target.value })} placeholder={values.hasAuthToken ? "Leave blank to keep saved value" : values.providerName === "RingCentral" ? "Paste RC_JWT" : "Enter token"} type="password" value={values.authToken} /></Field>
            <Field label={values.providerName === "RingCentral" ? "From number (RC_FROM_NUMBER)" : "From number"}><Input onChange={(event) => patch({ fromNumber: event.target.value })} placeholder="+15551234567 (include +1)" value={values.fromNumber} /></Field>
            <Field label={values.providerName === "RingCentral" ? "Server URL (RC_SERVER_URL)" : "Base URL"}><Input onChange={(event) => patch({ baseUrl: event.target.value })} value={values.baseUrl} /></Field>
          </div>
          {values.providerName !== "RingCentral" ? <Field label="Inbound SMS webhook URL (optional)"><Input onChange={(event) => patch({ smsWebhookUrl: event.target.value })} value={values.smsWebhookUrl} /></Field> : null}
          {values.providerName !== "RingCentral" ? <Field label="Voice webhook URL (optional)"><Input onChange={(event) => patch({ voiceWebhookUrl: event.target.value })} value={values.voiceWebhookUrl} /></Field> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={values.supportsSms} label="SMS enabled" onChange={(checked) => patch({ supportsSms: checked })} />
            {values.providerName !== "RingCentral" ? <Toggle checked={values.supportsVoice} label="Voice enabled" onChange={(checked) => patch({ supportsVoice: checked })} /> : null}
          </div>
          <Toggle checked={values.enableSmsSync} label="Automatic inbound SMS sync" onChange={(checked) => patch({ enableSmsSync: checked })} />
          {values.enableSmsSync ? (
            <div className="space-y-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sync interval (minutes)"><Input min={1} onChange={(event) => patch({ syncIntervalMinutes: event.target.value })} type="number" value={values.syncIntervalMinutes} /></Field>
                <Field label={values.providerName === "RingCentral" ? "Messages per request" : "Messages per sync"}><Input min={5} onChange={(event) => patch({ maxMessagesPerSync: event.target.value })} type="number" value={values.maxMessagesPerSync} /></Field>
              </div>
              {values.providerName === "RingCentral" ? <p className="text-xs leading-5 text-muted-foreground">First sync scans previous 24 hours. Later syncs scan from last successful run with 10-minute overlap. Every page is fetched; request size does not drop remaining SMS.</p> : null}
              <Field label="Local message retention">
                <Select onValueChange={(value) => patch({ localSmsRetentionDays: value })} value={values.localSmsRetentionDays}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Keep forever</SelectItem>
                    <SelectItem value="30">1 month</SelectItem>
                    <SelectItem value="90">3 months</SelectItem>
                    <SelectItem value="150">5 months</SelectItem>
                    <SelectItem value="365">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">Deletes completed SMS/MMS copies only from this workspace database. Never deletes provider messages.</p>
              </Field>
            </div>
          ) : null}
        </div>
        <SheetFooter>
          <Button disabled={mutation.isPending} onClick={() => void disconnect()} type="button" variant="destructive">{"Disconnect"}</Button>
          <Button disabled={mutation.isPending} onClick={() => void save()} type="button">{mutation.isPending ? "Saving..." : "Save connection"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>
}
