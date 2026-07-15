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
import { useGmailConnectUrl, useUpdateAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"

type Values = {
  providerName: "Gmail" | "Outlook" | "Custom"
  authType: "password" | "gmail-oauth"
  host: string
  port: string
  username: string
  password: string
  fromEmail: string
  fromName: string
  useSsl: boolean
  enableInboxSync: boolean
  imapHost: string
  imapPort: string
  imapUsername: string
  imapPassword: string
  imapUseSsl: boolean
  imapFolder: string
  mailboxTag: string
  leadTemplateTags: string
  gmailEmail: string
  duplicatePolicy: "skip-exact-message" | "process-every-message"
  autoCreateLeads: boolean
  syncIntervalMinutes: string
  maxMessagesPerSync: string
  hasPassword: boolean
  hasImapPassword: boolean
}

const emptyValues = (): Values => ({
  providerName: "Gmail",
  authType: "password",
  host: "smtp.gmail.com",
  port: "587",
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  useSsl: true,
  enableInboxSync: false,
  imapHost: "imap.gmail.com",
  imapPort: "993",
  imapUsername: "",
  imapPassword: "",
  imapUseSsl: true,
  imapFolder: "INBOX",
  mailboxTag: "",
  leadTemplateTags: "",
  gmailEmail: "",
  duplicatePolicy: "skip-exact-message",
  autoCreateLeads: true,
  syncIntervalMinutes: "10",
  maxMessagesPerSync: "25",
  hasPassword: false,
  hasImapPassword: false,
})

export function IntegrationMailSheet({
  config,
  onOpenChange,
  open,
}: {
  config?: (Partial<Omit<Values, "leadTemplateTags">> & { leadTemplateTags?: string[] | string }) | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const mutation = useUpdateAgencyIntegrationSettings()
  const gmailConnect = useGmailConnectUrl()
  const [values, setValues] = useState<Values>(() => emptyValues())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const defaults = emptyValues()
    setValues({
      ...defaults,
      ...config,
      password: "",
      imapPassword: "",
      port: String(config?.port ?? defaults.port),
      imapPort: String(config?.imapPort ?? defaults.imapPort),
      leadTemplateTags: Array.isArray(config?.leadTemplateTags)
        ? config.leadTemplateTags.join(", ")
        : String(config?.leadTemplateTags ?? defaults.leadTemplateTags),
      syncIntervalMinutes: String(config?.syncIntervalMinutes ?? defaults.syncIntervalMinutes),
      maxMessagesPerSync: String(config?.maxMessagesPerSync ?? defaults.maxMessagesPerSync),
    })
    setError(null)
  }, [config, open])

  function patch(update: Partial<Values>) {
    setValues((current) => ({ ...current, ...update }))
  }

  function changeProvider(providerName: Values["providerName"]) {
    if (providerName === "Gmail") {
      patch({ providerName, host: "smtp.gmail.com", port: "587", imapHost: "imap.gmail.com", imapPort: "993" })
    } else if (providerName === "Outlook") {
      patch({ providerName, host: "smtp.office365.com", port: "587", imapHost: "outlook.office365.com", imapPort: "993" })
    } else {
      patch({ providerName })
    }
  }

  async function save() {
    setError(null)
    if (values.authType !== "gmail-oauth" && (!values.host.trim() || !values.username.trim() || !values.fromEmail.trim())) {
      setError("SMTP host, username, and from email are required.")
      return
    }
    if (values.authType !== "gmail-oauth" && !values.password.trim() && !values.hasPassword) {
      setError("SMTP password is required for a new connection.")
      return
    }
    if (
      values.enableInboxSync &&
      values.authType !== "gmail-oauth" &&
      (!values.imapHost.trim() || !values.imapUsername.trim())
    ) {
      setError("IMAP host and username are required when inbox sync is enabled.")
      return
    }
    if (
      values.enableInboxSync &&
      values.authType !== "gmail-oauth" &&
      !values.imapPassword.trim() &&
      !values.hasImapPassword &&
      !values.password.trim() &&
      !values.hasPassword
    ) {
      setError("IMAP password is required when inbox sync is enabled.")
      return
    }

    const response = await mutation.mutateAsync({
      smtp: {
        providerName: values.providerName,
        authType: values.authType,
        host: values.host.trim(),
        port: Math.max(1, Number(values.port) || 587),
        username: values.username.trim(),
        password: values.password,
        fromEmail: values.fromEmail.trim(),
        fromName: values.fromName.trim() || null,
        useSsl: values.useSsl,
        enableInboxSync: values.enableInboxSync,
        imapHost: values.imapHost.trim() || null,
        imapPort: Math.max(1, Number(values.imapPort) || 993),
        imapUsername: values.imapUsername.trim() || null,
        imapPassword: values.imapPassword.trim() || null,
        imapUseSsl: values.imapUseSsl,
        imapFolder: values.imapFolder.trim() || null,
        mailboxTag: values.mailboxTag.trim() || null,
        leadTemplateTags: splitTags(values.leadTemplateTags),
        duplicatePolicy: values.duplicatePolicy,
        autoCreateLeads: values.autoCreateLeads,
        syncIntervalMinutes: Math.max(5, Number(values.syncIntervalMinutes) || 10),
        maxMessagesPerSync: Math.max(5, Number(values.maxMessagesPerSync) || 25),
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
    const response = await mutation.mutateAsync({ clearSmtp: true })
    if (response.error) {
      setError(response.error.message)
      return
    }
    onOpenChange(false)
  }

  async function connectGmail() {
    setError(null)
    const response = await gmailConnect.mutateAsync({
      returnTo: "/dashboard/settings",
      mailboxTag: values.mailboxTag.trim() || "gmail",
      leadTemplateTags: splitTags(values.leadTemplateTags),
    })
    if (response.error || !response.data?.url) {
      setError(response.error?.message ?? "Could not start Gmail connection.")
      return
    }
    window.location.assign(response.data.url)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="shadow-none sm:w-[38rem] sm:max-w-[38rem]">
        <SheetHeader className="border-b">
          <SheetTitle>{"Email and inbox"}</SheetTitle>
          <SheetDescription>
            {"Leave saved password fields blank to keep the existing credentials."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="grid gap-3 rounded-xl border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{"Gmail one-click"}</p>
                <p className="text-xs text-muted-foreground">
                  {values.authType === "gmail-oauth" ? `Connected: ${values.gmailEmail || "Gmail"}` : "Connect Gmail for send + inbox sync."}
                </p>
              </div>
              <Button disabled={gmailConnect.isPending} onClick={() => void connectGmail()} size="sm" type="button" variant="outline">
                {gmailConnect.isPending ? "Opening..." : values.authType === "gmail-oauth" ? "Reconnect Gmail" : "Connect Gmail"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mailbox tag"><Input onChange={(event) => patch({ mailboxTag: event.target.value })} placeholder="gmail, zillow, realtor" value={values.mailboxTag} /></Field>
              <Field label="Lead template tags"><Input onChange={(event) => patch({ leadTemplateTags: event.target.value })} placeholder="zillow, realtor, contact" value={values.leadTemplateTags} /></Field>
            </div>
          </div>
          <Field label="Provider">
            <Select onValueChange={(value) => changeProvider(value as Values["providerName"])} value={values.providerName}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Gmail">{"Gmail"}</SelectItem>
                <SelectItem value="Outlook">{"Outlook"}</SelectItem>
                <SelectItem value="Custom">{"Custom SMTP"}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SMTP host"><Input onChange={(event) => patch({ host: event.target.value })} value={values.host} /></Field>
            <Field label="SMTP port"><Input onChange={(event) => patch({ port: event.target.value })} type="number" value={values.port} /></Field>
            <Field label="Username"><Input onChange={(event) => patch({ username: event.target.value })} value={values.username} /></Field>
            <Field label={values.hasPassword ? "SMTP password (saved)" : "SMTP password"}><Input autoComplete="new-password" onChange={(event) => patch({ password: event.target.value })} placeholder={values.hasPassword ? "Leave blank to keep saved password" : "Enter password"} type="password" value={values.password} /></Field>
            <Field label="From email"><Input onChange={(event) => patch({ fromEmail: event.target.value })} type="email" value={values.fromEmail} /></Field>
            <Field label="From name"><Input onChange={(event) => patch({ fromName: event.target.value })} value={values.fromName} /></Field>
          </div>
          <Toggle checked={values.useSsl} label="Secure SMTP" onChange={(checked) => patch({ useSsl: checked })} />
          <Toggle checked={values.enableInboxSync} label="Inbox sync" onChange={(checked) => patch({ enableInboxSync: checked })} />
          {values.enableInboxSync && values.authType !== "gmail-oauth" ? (
            <div className="space-y-4 rounded-xl border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="IMAP host"><Input onChange={(event) => patch({ imapHost: event.target.value })} value={values.imapHost} /></Field>
                <Field label="IMAP port"><Input onChange={(event) => patch({ imapPort: event.target.value })} type="number" value={values.imapPort} /></Field>
                <Field label="IMAP username"><Input onChange={(event) => patch({ imapUsername: event.target.value })} value={values.imapUsername} /></Field>
                <Field label={values.hasImapPassword ? "IMAP password (saved)" : "IMAP password"}><Input autoComplete="new-password" onChange={(event) => patch({ imapPassword: event.target.value })} placeholder={values.hasImapPassword ? "Leave blank to keep saved password" : "Defaults to SMTP password"} type="password" value={values.imapPassword} /></Field>
                <Field label="Folder"><Input onChange={(event) => patch({ imapFolder: event.target.value })} value={values.imapFolder} /></Field>
                <Field label="Sync interval"><Input min={5} onChange={(event) => patch({ syncIntervalMinutes: event.target.value })} type="number" value={values.syncIntervalMinutes} /></Field>
                <Field label="Messages per sync"><Input min={5} onChange={(event) => patch({ maxMessagesPerSync: event.target.value })} type="number" value={values.maxMessagesPerSync} /></Field>
              </div>
              <Toggle checked={values.imapUseSsl} label="Secure IMAP" onChange={(checked) => patch({ imapUseSsl: checked })} />
              <Toggle checked={values.autoCreateLeads} label="Auto-create leads" onChange={(checked) => patch({ autoCreateLeads: checked })} />
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

function splitTags(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))]
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />{label}</label>
}
