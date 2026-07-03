"use client"

import { useMemo, useState } from "react"

import type { UpdateAgencyIntegrationSettingsInput } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  useAgencyIntegrationSettings,
  useUpdateAgencyIntegrationSettings,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

type IntegrationKey = "communication" | "smtp" | "aiProvider"

type CommunicationValues = {
  providerName: "Twilio" | "Plivo" | "RingCentral" | "Custom"
  accountId: string
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
}

type MailValues = {
  providerName: "Gmail" | "Outlook" | "Custom"
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
  duplicatePolicy: "skip-exact-message" | "process-every-message"
  autoCreateLeads: boolean
  syncIntervalMinutes: string
  maxMessagesPerSync: string
}

type AiValues = {
  providerName: "OpenAI" | "Ollama" | "Custom"
  baseUrl: string
  model: string
  apiKey: string
}

const blankCommunication = (): CommunicationValues => ({
  providerName: "Twilio",
  accountId: "",
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
})

const blankMail = (): MailValues => ({
  providerName: "Gmail",
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
  duplicatePolicy: "skip-exact-message",
  autoCreateLeads: true,
  syncIntervalMinutes: "10",
  maxMessagesPerSync: "25",
})

const blankAi = (): AiValues => ({
  providerName: "OpenAI",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-5.4",
  apiKey: "",
})

function providerPreset(value: CommunicationValues["providerName"], current: CommunicationValues) {
  if (value === "Twilio") {
    return { ...current, providerName: value, baseUrl: "https://api.twilio.com", smsWebhookUrl: "/api/sms-webhooks/twilio" }
  }
  if (value === "Plivo") {
    return { ...current, providerName: value, baseUrl: "https://api.plivo.com", smsWebhookUrl: "/api/sms-webhooks/plivo" }
  }
  if (value === "RingCentral") {
    return { ...current, providerName: value, baseUrl: "https://platform.ringcentral.com", smsWebhookUrl: "/api/sms-webhooks/ringcentral" }
  }
  return { ...current, providerName: value }
}

function mailPreset(value: MailValues["providerName"], current: MailValues) {
  if (value === "Gmail") {
    return {
      ...current,
      providerName: value,
      host: "smtp.gmail.com",
      port: "587",
      imapHost: "imap.gmail.com",
      imapPort: "993",
    }
  }
  if (value === "Outlook") {
    return {
      ...current,
      providerName: value,
      host: "smtp.office365.com",
      port: "587",
      imapHost: "outlook.office365.com",
      imapPort: "993",
    }
  }
  return { ...current, providerName: value }
}

function aiPreset(value: AiValues["providerName"], current: AiValues) {
  if (value === "OpenAI") {
    return { ...current, providerName: value, baseUrl: "https://api.openai.com/v1", model: current.model || "gpt-5.4" }
  }
  if (value === "Ollama") {
    return { ...current, providerName: value, baseUrl: "http://localhost:11434", model: current.model || "llama3.2", apiKey: "" }
  }
  return { ...current, providerName: value }
}

function IntegrationStatusCard({
  configured,
  description,
  icon,
  onConfigure,
  provider,
  syncText,
  title,
  updatedAt,
}: {
  configured: boolean
  description: string
  icon: string
  onConfigure: () => void
  provider?: string | null
  syncText?: string
  title: string
  updatedAt?: string | null
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
            <AppIcon name={icon} />
          </span>
          <Badge variant={configured ? "secondary" : "outline"}>
            {configured ? "Connected" : "Not connected"}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-base text-foreground">{title}</CardTitle>
          <CardDescription className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Provider"}</dt>
            <dd className="font-medium text-foreground">{provider || "Not selected"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Sync"}</dt>
            <dd className="text-right font-medium text-foreground">{syncText || "Manual"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Updated"}</dt>
            <dd className="text-right text-xs font-medium text-foreground">
              {updatedAt ? formatDateTimeLabel(updatedAt) : "Never"}
            </dd>
          </div>
        </dl>
        <Button className="w-full" onClick={onConfigure} type="button" variant={configured ? "outline" : "default"}>
          {configured ? "Manage connection" : "Connect"}
        </Button>
      </CardContent>
    </Card>
  )
}

function ToggleRow({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border p-3">
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </label>
  )
}

export function SecureIntegrationsSectionV2() {
  const statusQuery = useAgencyIntegrationSettings()
  const updateMutation = useUpdateAgencyIntegrationSettings()
  const [active, setActive] = useState<IntegrationKey | null>(null)
  const [communication, setCommunication] = useState<CommunicationValues>(() => blankCommunication())
  const [mail, setMail] = useState<MailValues>(() => blankMail())
  const [ai, setAi] = useState<AiValues>(() => blankAi())
  const [error, setError] = useState<string | null>(null)

  const status = statusQuery.data
  const cards = useMemo(
    () => [
      {
        key: "communication" as const,
        configured: status?.hasCommunicationConfig ?? false,
        title: "Calls and SMS",
        description: "Outbound calls, SMS reminders, inbound message sync, and webhook delivery.",
        icon: "phone_in_talk",
        provider: status?.communicationProviderName,
        syncText: status?.communicationSmsSyncEnabled
          ? `Every ${status.communicationSmsSyncIntervalMinutes ?? 5} min`
          : "Webhook / manual",
        updatedAt: status?.communicationUpdatedAt,
      },
      {
        key: "smtp" as const,
        configured: status?.hasSmtpConfig ?? false,
        title: "Email and inbox",
        description: "SMTP sending plus optional IMAP inbox synchronization and automatic lead creation.",
        icon: "mail",
        provider: status?.smtpProviderName,
        syncText: status?.mailboxSyncEnabled
          ? `Every ${status.mailboxSyncIntervalMinutes ?? 10} min`
          : "Sending only",
        updatedAt: status?.smtpUpdatedAt,
      },
      {
        key: "aiProvider" as const,
        configured: status?.hasAiProviderConfig ?? false,
        title: "AI provider",
        description: "Feedback classification, summaries, and AI-assisted workspace features.",
        icon: "auto_awesome",
        provider: status?.aiProviderName,
        syncText: "On demand",
        updatedAt: status?.aiProviderUpdatedAt,
      },
    ],
    [status],
  )

  async function save(payload: UpdateAgencyIntegrationSettingsInput, reset: () => void) {
    setError(null)
    const result = await updateMutation.mutateAsync(payload)
    if (result.error) {
      setError(result.error.message)
      return
    }
    reset()
    setActive(null)
  }

  async function clearActive() {
    if (!active) return
    const payload: UpdateAgencyIntegrationSettingsInput =
      active === "communication"
        ? { clearCommunication: true }
        : active === "smtp"
          ? { clearSmtp: true }
          : { clearAiProvider: true }
    await save(payload, () => {
      setCommunication(blankCommunication())
      setMail(blankMail())
      setAi(blankAi())
    })
  }

  return (
    <section className="space-y-4" id="integrations">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{"Integrations"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Connection cards stay compact. Credentials and advanced options open only when needed."}
          </p>
        </div>
        {statusQuery.isLoading ? <Badge variant="outline">{"Loading status"}</Badge> : null}
      </div>

      {statusQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>{statusQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <IntegrationStatusCard
            configured={card.configured}
            description={card.description}
            icon={card.icon}
            key={card.key}
            onConfigure={() => {
              setError(null)
              setActive(card.key)
            }}
            provider={card.provider}
            syncText={card.syncText}
            title={card.title}
            updatedAt={card.updatedAt}
          />
        ))}
      </div>

      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="sm:w-[36rem] sm:max-w-[36rem]" showCloseButton={!updateMutation.isPending}>
          <SheetHeader className="border-b">
            <SheetTitle>
              {active === "communication"
                ? "Calls and SMS connection"
                : active === "smtp"
                  ? "Email and inbox connection"
                  : "AI provider connection"}
            </SheetTitle>
            <SheetDescription>
              {"Saved secrets remain write-only. Enter a new value only when connecting or replacing the current configuration."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {active === "communication" ? (
              <>
                <div className="space-y-2">
                  <Label>{"Provider"}</Label>
                  <Select
                    onValueChange={(value) =>
                      setCommunication((current) => providerPreset(value as CommunicationValues["providerName"], current))
                    }
                    value={communication.providerName}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[
                        ["Twilio", "Twilio"],
                        ["Plivo", "Plivo"],
                        ["RingCentral", "RingCentral"],
                        ["Custom", "Custom provider"],
                      ].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>{"Account / client ID"}</Label><Input autoComplete="off" onChange={(event) => setCommunication((current) => ({ ...current, accountId: event.target.value }))} value={communication.accountId} /></div>
                  <div className="space-y-2"><Label>{"Auth token"}</Label><Input autoComplete="new-password" onChange={(event) => setCommunication((current) => ({ ...current, authToken: event.target.value }))} type="password" value={communication.authToken} /></div>
                  <div className="space-y-2"><Label>{"From number"}</Label><Input onChange={(event) => setCommunication((current) => ({ ...current, fromNumber: event.target.value }))} placeholder="+1 555 010 2000" value={communication.fromNumber} /></div>
                  <div className="space-y-2"><Label>{"Base URL"}</Label><Input onChange={(event) => setCommunication((current) => ({ ...current, baseUrl: event.target.value }))} value={communication.baseUrl} /></div>
                </div>
                <div className="space-y-2"><Label>{"SMS webhook path"}</Label><Input onChange={(event) => setCommunication((current) => ({ ...current, smsWebhookUrl: event.target.value }))} value={communication.smsWebhookUrl} /><p className="text-xs text-muted-foreground">{"Use your public backend URL plus this path in the provider dashboard."}</p></div>
                <div className="space-y-2"><Label>{"Voice webhook URL"}</Label><Input onChange={(event) => setCommunication((current) => ({ ...current, voiceWebhookUrl: event.target.value }))} value={communication.voiceWebhookUrl} /></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleRow checked={communication.supportsSms} description="Enable SMS sending and reminders." label="SMS enabled" onChange={(checked) => setCommunication((current) => ({ ...current, supportsSms: checked }))} />
                  <ToggleRow checked={communication.supportsVoice} description="Enable outbound call workflows." label="Voice enabled" onChange={(checked) => setCommunication((current) => ({ ...current, supportsVoice: checked }))} />
                </div>
                <ToggleRow checked={communication.enableSmsSync} description="Poll supported providers for inbound SMS in addition to webhooks." label="Automatic SMS sync" onChange={(checked) => setCommunication((current) => ({ ...current, enableSmsSync: checked }))} />
                {communication.enableSmsSync ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label>{"Sync interval (minutes)"}</Label><Input min={1} onChange={(event) => setCommunication((current) => ({ ...current, syncIntervalMinutes: event.target.value }))} type="number" value={communication.syncIntervalMinutes} /></div>
                    <div className="space-y-2"><Label>{"Messages per sync"}</Label><Input min={5} onChange={(event) => setCommunication((current) => ({ ...current, maxMessagesPerSync: event.target.value }))} type="number" value={communication.maxMessagesPerSync} /></div>
                  </div>
                ) : null}
              </>
            ) : null}

            {active === "smtp" ? (
              <>
                <div className="space-y-2"><Label>{"Provider"}</Label><Select onValueChange={(value) => setMail((current) => mailPreset(value as MailValues["providerName"], current))} value={mail.providerName}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Gmail">{"Gmail"}</SelectItem><SelectItem value="Outlook">{"Outlook"}</SelectItem><SelectItem value="Custom">{"Custom SMTP"}</SelectItem></SelectContent></Select></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>{"SMTP host"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, host: event.target.value }))} value={mail.host} /></div>
                  <div className="space-y-2"><Label>{"SMTP port"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, port: event.target.value }))} type="number" value={mail.port} /></div>
                  <div className="space-y-2"><Label>{"Username"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, username: event.target.value }))} value={mail.username} /></div>
                  <div className="space-y-2"><Label>{"Password / app password"}</Label><Input autoComplete="new-password" onChange={(event) => setMail((current) => ({ ...current, password: event.target.value }))} type="password" value={mail.password} /></div>
                  <div className="space-y-2"><Label>{"From email"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, fromEmail: event.target.value }))} type="email" value={mail.fromEmail} /></div>
                  <div className="space-y-2"><Label>{"From name"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, fromName: event.target.value }))} value={mail.fromName} /></div>
                </div>
                <ToggleRow checked={mail.useSsl} description="Use TLS/SSL for outgoing email." label="Secure SMTP" onChange={(checked) => setMail((current) => ({ ...current, useSsl: checked }))} />
                <ToggleRow checked={mail.enableInboxSync} description="Read inbound messages and optionally create leads." label="Inbox sync" onChange={(checked) => setMail((current) => ({ ...current, enableInboxSync: checked }))} />
                {mail.enableInboxSync ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2"><Label>{"IMAP host"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, imapHost: event.target.value }))} value={mail.imapHost} /></div>
                      <div className="space-y-2"><Label>{"IMAP port"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, imapPort: event.target.value }))} type="number" value={mail.imapPort} /></div>
                      <div className="space-y-2"><Label>{"IMAP username"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, imapUsername: event.target.value }))} value={mail.imapUsername} /></div>
                      <div className="space-y-2"><Label>{"IMAP password"}</Label><Input autoComplete="new-password" onChange={(event) => setMail((current) => ({ ...current, imapPassword: event.target.value }))} type="password" value={mail.imapPassword} /></div>
                      <div className="space-y-2"><Label>{"Folder"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, imapFolder: event.target.value }))} value={mail.imapFolder} /></div>
                      <div className="space-y-2"><Label>{"Mailbox tag"}</Label><Input onChange={(event) => setMail((current) => ({ ...current, mailboxTag: event.target.value }))} value={mail.mailboxTag} /></div>
                      <div className="space-y-2"><Label>{"Sync interval"}</Label><Input min={5} onChange={(event) => setMail((current) => ({ ...current, syncIntervalMinutes: event.target.value }))} type="number" value={mail.syncIntervalMinutes} /></div>
                      <div className="space-y-2"><Label>{"Messages per sync"}</Label><Input min={5} onChange={(event) => setMail((current) => ({ ...current, maxMessagesPerSync: event.target.value }))} type="number" value={mail.maxMessagesPerSync} /></div>
                    </div>
                    <ToggleRow checked={mail.autoCreateLeads} description="Create or update CRM leads from matched inbound email." label="Auto-create leads" onChange={(checked) => setMail((current) => ({ ...current, autoCreateLeads: checked }))} />
                  </>
                ) : null}
              </>
            ) : null}

            {active === "aiProvider" ? (
              <>
                <div className="space-y-2"><Label>{"Provider"}</Label><Select onValueChange={(value) => setAi((current) => aiPreset(value as AiValues["providerName"], current))} value={ai.providerName}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OpenAI">{"OpenAI"}</SelectItem><SelectItem value="Ollama">{"Ollama"}</SelectItem><SelectItem value="Custom">{"Custom OpenAI-compatible"}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{"Base URL"}</Label><Input onChange={(event) => setAi((current) => ({ ...current, baseUrl: event.target.value }))} value={ai.baseUrl} /></div>
                <div className="space-y-2"><Label>{"Model"}</Label><Input onChange={(event) => setAi((current) => ({ ...current, model: event.target.value }))} value={ai.model} /></div>
                {ai.providerName !== "Ollama" ? <div className="space-y-2"><Label>{"API key"}</Label><Input autoComplete="new-password" onChange={(event) => setAi((current) => ({ ...current, apiKey: event.target.value }))} type="password" value={ai.apiKey} /></div> : null}
              </>
            ) : null}
          </div>

          <SheetFooter>
            <Button disabled={updateMutation.isPending} onClick={() => void clearActive()} type="button" variant="destructive">
              {"Disconnect"}
            </Button>
            <Button
              disabled={updateMutation.isPending}
              onClick={() => {
                if (active === "communication") {
                  void save(
                    {
                      communication: {
                        accountId: communication.accountId.trim(),
                        authToken: communication.authToken.trim(),
                        baseUrl: communication.baseUrl.trim() || null,
                        enableSmsSync: communication.enableSmsSync,
                        fromNumber: communication.fromNumber.trim(),
                        maxMessagesPerSync: Math.max(5, Number(communication.maxMessagesPerSync) || 25),
                        providerName: communication.providerName,
                        smsWebhookUrl: communication.smsWebhookUrl.trim() || null,
                        supportsSms: communication.supportsSms,
                        supportsVoice: communication.supportsVoice,
                        syncIntervalMinutes: Math.max(1, Number(communication.syncIntervalMinutes) || 5),
                        voiceWebhookUrl: communication.voiceWebhookUrl.trim() || null,
                      },
                    },
                    () => setCommunication(blankCommunication()),
                  )
                } else if (active === "smtp") {
                  void save(
                    {
                      smtp: {
                        autoCreateLeads: mail.autoCreateLeads,
                        duplicatePolicy: mail.duplicatePolicy,
                        enableInboxSync: mail.enableInboxSync,
                        fromEmail: mail.fromEmail.trim(),
                        fromName: mail.fromName.trim() || null,
                        host: mail.host.trim(),
                        imapFolder: mail.imapFolder.trim() || null,
                        imapHost: mail.imapHost.trim() || null,
                        imapPassword: mail.imapPassword.trim() || null,
                        imapPort: Math.max(1, Number(mail.imapPort) || 993),
                        imapUseSsl: mail.imapUseSsl,
                        imapUsername: mail.imapUsername.trim() || null,
                        mailboxTag: mail.mailboxTag.trim() || null,
                        maxMessagesPerSync: Math.max(5, Number(mail.maxMessagesPerSync) || 25),
                        password: mail.password,
                        port: Math.max(1, Number(mail.port) || 587),
                        providerName: mail.providerName,
                        syncIntervalMinutes: Math.max(5, Number(mail.syncIntervalMinutes) || 10),
                        useSsl: mail.useSsl,
                        username: mail.username.trim(),
                      },
                    },
                    () => setMail(blankMail()),
                  )
                } else if (active === "aiProvider") {
                  void save(
                    {
                      aiProvider: {
                        apiKey: ai.apiKey.trim(),
                        baseUrl: ai.baseUrl.trim() || null,
                        model: ai.model.trim(),
                        providerName: ai.providerName,
                      },
                    },
                    () => setAi(blankAi()),
                  )
                }
              }}
              type="button"
            >
              {updateMutation.isPending ? "Validating..." : "Validate and save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  )
}
