"use client"

import { type ReactNode, useState } from "react"

import type { UpdateAgencyIntegrationSettingsInput } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { useAgencyIntegrationSettings, useUpdateAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

type SectionKey = "aiProvider" | "communication" | "smtp"

type CommunicationFormValues = {
  providerName: "Custom" | "Plivo" | "Twilio"
  accountId: string
  authToken: string
  fromNumber: string
  baseUrl: string
  voiceWebhookUrl: string
  supportsSms: boolean
  supportsVoice: boolean
}

type AiProviderFormValues = {
  providerName: "Custom" | "Ollama" | "OpenAI"
  baseUrl: string
  model: string
  apiKey: string
}

type SmtpFormValues = {
  providerName: "Custom" | "Gmail" | "Outlook"
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
  syncIntervalMinutes: string
  maxMessagesPerSync: string
}

type IntegrationCardProps = {
  children: ReactNode
  configured: boolean
  description: string
  iconContainerClassName: string
  iconClassName: string
  iconName: string
  isBusy: boolean
  onClear: () => void
  onSave: () => void
  providerLabel?: string | null
  saveDisabled: boolean
  subtitle: string
  title: string
  updatedAt?: string | null
}

const blankCommunicationForm = (): CommunicationFormValues => ({
  providerName: "Twilio",
  accountId: "",
  authToken: "",
  fromNumber: "",
  baseUrl: "",
  voiceWebhookUrl: "",
  supportsSms: true,
  supportsVoice: true,
})

const blankAiProviderForm = (): AiProviderFormValues => ({
  providerName: "OpenAI",
  baseUrl: "",
  model: "gpt-5.4",
  apiKey: "",
})

const blankSmtpForm = (): SmtpFormValues => ({
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
  syncIntervalMinutes: "10",
  maxMessagesPerSync: "25",
})

function updateLabel(configured: boolean, updatedAt?: string | null) {
  if (!configured) {
    return "Not configured yet"
  }

  if (!updatedAt) {
    return "Configured"
  }

  return `Updated ${formatDateTimeLabel(updatedAt)}`
}

function statusBadge(configured: boolean) {
  if (configured) {
    return {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Configured",
    }
  }

  return {
    className: "border-slate-200 bg-slate-100 text-slate-600",
    label: "Write only",
  }
}

function IntegrationCard({
  children,
  configured,
  description,
  iconContainerClassName,
  iconClassName,
  iconName,
  isBusy,
  onClear,
  onSave,
  providerLabel,
  saveDisabled,
  subtitle,
  title,
  updatedAt,
}: IntegrationCardProps) {
  const badge = statusBadge(configured)

  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${iconContainerClassName}`}>
            <AppIcon className={`text-2xl ${iconClassName}`} name={iconName as never} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-black tracking-tight text-slate-900">{title}</h4>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{subtitle}</p>
            <p className="mt-3 text-xs font-semibold text-slate-500">{updateLabel(configured, updatedAt)}</p>
            {providerLabel ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                {`Provider: ${providerLabel}`}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-4">{children}</div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
        <button
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saveDisabled || isBusy}
          onClick={onSave}
          type="button"
        >
          {isBusy ? "Validating..." : "Validate & Save"}
        </button>
        <button
          className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isBusy}
          onClick={onClear}
          type="button"
        >
          {isBusy ? "Working..." : "Clear Saved Config"}
        </button>
      </div>
    </section>
  )
}

function SectionError({ error }: { error?: string | null }) {
  if (!error) {
    return null
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
      {error}
    </div>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-sm font-bold text-slate-700">{children}</span>
}

function NativeSelect({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled: boolean
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
  value: string
}) {
  return (
    <select
      className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function trimValue(value: string) {
  return value.trim()
}

function applyCommunicationPreset(
  current: CommunicationFormValues,
  providerName: CommunicationFormValues["providerName"],
): CommunicationFormValues {
  const nextBaseUrl =
    providerName === "Plivo"
      ? "https://api.plivo.com"
      : providerName === "Twilio"
        ? "https://api.twilio.com"
        : current.baseUrl

  return {
    ...current,
    providerName,
    baseUrl: nextBaseUrl,
  }
}

function applyAiProviderPreset(
  current: AiProviderFormValues,
  providerName: AiProviderFormValues["providerName"],
): AiProviderFormValues {
  if (providerName === "Ollama") {
    return {
      ...current,
      providerName,
      apiKey: "",
      baseUrl: "http://localhost:11434",
      model: current.model || "llama3.2",
    }
  }

  if (providerName === "OpenAI") {
    return {
      ...current,
      providerName,
      baseUrl: "https://api.openai.com/v1",
      model: current.model || "gpt-5.4",
    }
  }

  return {
    ...current,
    providerName,
  }
}

function applyMailPreset(current: SmtpFormValues, providerName: SmtpFormValues["providerName"]): SmtpFormValues {
  if (providerName === "Gmail") {
    return {
      ...current,
      providerName,
      host: "smtp.gmail.com",
      imapHost: "imap.gmail.com",
      imapPort: "993",
      port: "587",
      imapUseSsl: true,
      useSsl: true,
    }
  }

  if (providerName === "Outlook") {
    return {
      ...current,
      providerName,
      host: "smtp.office365.com",
      imapHost: "outlook.office365.com",
      imapPort: "993",
      port: "587",
      imapUseSsl: true,
      useSsl: true,
    }
  }

  return {
    ...current,
    providerName,
  }
}

function buildCommunicationPayload(values: CommunicationFormValues): UpdateAgencyIntegrationSettingsInput {
  return {
    communication: {
      accountId: trimValue(values.accountId),
      authToken: trimValue(values.authToken),
      baseUrl: trimValue(values.baseUrl) || undefined,
      voiceWebhookUrl: trimValue(values.voiceWebhookUrl) || undefined,
      fromNumber: trimValue(values.fromNumber),
      providerName: values.providerName,
      supportsSms: values.supportsSms,
      supportsVoice: values.supportsVoice,
    },
  }
}

function buildAiProviderPayload(values: AiProviderFormValues): UpdateAgencyIntegrationSettingsInput {
  return {
    aiProvider: {
      apiKey: trimValue(values.apiKey),
      baseUrl: trimValue(values.baseUrl) || undefined,
      model: trimValue(values.model),
      providerName: values.providerName,
    },
  }
}

function buildSmtpPayload(values: SmtpFormValues): UpdateAgencyIntegrationSettingsInput {
  return {
    smtp: {
      fromEmail: trimValue(values.fromEmail),
      fromName: trimValue(values.fromName) || undefined,
      host: trimValue(values.host),
      password: trimValue(values.password),
      port: Math.max(1, Number(values.port) || 0),
      providerName: values.providerName,
      useSsl: values.useSsl,
      username: trimValue(values.username),
      enableInboxSync: values.enableInboxSync,
      imapFolder: trimValue(values.imapFolder) || undefined,
      imapHost: trimValue(values.imapHost) || undefined,
      imapPassword: trimValue(values.imapPassword) || undefined,
      imapPort: Math.max(1, Number(values.imapPort) || 0),
      imapUseSsl: values.imapUseSsl,
      imapUsername: trimValue(values.imapUsername) || undefined,
      maxMessagesPerSync: Math.max(5, Number(values.maxMessagesPerSync) || 0),
      syncIntervalMinutes: Math.max(5, Number(values.syncIntervalMinutes) || 0),
    },
  }
}

export function SecureIntegrationsSection() {
  const integrationStatusQuery = useAgencyIntegrationSettings()
  const updateMutation = useUpdateAgencyIntegrationSettings()

  const [aiProviderValues, setAiProviderValues] = useState<AiProviderFormValues>(() => blankAiProviderForm())
  const [communicationValues, setCommunicationValues] = useState<CommunicationFormValues>(() => blankCommunicationForm())
  const [pendingSection, setPendingSection] = useState<SectionKey | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<SectionKey, string | null>>({
    aiProvider: null,
    communication: null,
    smtp: null,
  })
  const [smtpValues, setSmtpValues] = useState<SmtpFormValues>(() => blankSmtpForm())

  const status = integrationStatusQuery.data
  const isBusy = updateMutation.isPending

  async function submitSection(
    section: SectionKey,
    payload: UpdateAgencyIntegrationSettingsInput,
    reset: () => void,
  ) {
    setPendingSection(section)
    setSectionErrors((current) => ({ ...current, [section]: null }))

    try {
      const response = await updateMutation.mutateAsync(payload)

      if (response.error) {
        setSectionErrors((current) => ({
          ...current,
          [section]: response.error?.message || "Failed to update this integration.",
        }))
        return
      }

      reset()
    }
    catch (error) {
      setSectionErrors((current) => ({
        ...current,
        [section]: error instanceof Error ? error.message : "Failed to update this integration.",
      }))
    }
    finally {
      setPendingSection(null)
    }
  }

  const canSaveCommunication =
    trimValue(communicationValues.accountId).length > 0 &&
    trimValue(communicationValues.authToken).length > 0 &&
    trimValue(communicationValues.fromNumber).length > 0 &&
    (communicationValues.providerName !== "Custom" || trimValue(communicationValues.baseUrl).length > 0)

  const requiresAiKey = aiProviderValues.providerName === "OpenAI"
  const canSaveAiProvider =
    trimValue(aiProviderValues.model).length > 0 &&
    (aiProviderValues.providerName !== "Custom" || trimValue(aiProviderValues.baseUrl).length > 0) &&
    (!requiresAiKey || trimValue(aiProviderValues.apiKey).length > 0)

  const smtpPort = Number(smtpValues.port)
  const imapPort = Number(smtpValues.imapPort)
  const canSaveSmtp =
    trimValue(smtpValues.host).length > 0 &&
    trimValue(smtpValues.username).length > 0 &&
    trimValue(smtpValues.password).length > 0 &&
    trimValue(smtpValues.fromEmail).length > 0 &&
    Number.isFinite(smtpPort) &&
    smtpPort > 0 &&
    (
      !smtpValues.enableInboxSync ||
      (
        trimValue(smtpValues.imapHost).length > 0 &&
        Number.isFinite(imapPort) &&
        imapPort > 0
      )
    )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4">
        <div className="flex items-start gap-3">
          <AppIcon className="mt-0.5 text-lg text-amber-700" name="settings" />
          <div>
            <p className="text-sm font-bold text-amber-900">{"Validated integration vault"}</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              {"Each save now validates the provider connection first, then stores the credentials encrypted on the server without sending them back to the browser."}
            </p>
            {status?.updatedAt ? (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800/80">
                {`Last integration change ${formatDateTimeLabel(status.updatedAt)}`}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {integrationStatusQuery.isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
          {"Loading saved integration status..."}
        </div>
      ) : null}

      {integrationStatusQuery.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {integrationStatusQuery.error.message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <IntegrationCard
          configured={status?.hasCommunicationConfig ?? false}
          description="Use Twilio, Plivo, or a custom provider for lead SMS, call triggers, reminders, and scheduled outreach."
          iconContainerClassName="bg-red-50"
          iconClassName="text-red-600"
          iconName="phone_in_talk"
          isBusy={isBusy && pendingSection === "communication"}
          onClear={() =>
            void submitSection("communication", { clearCommunication: true }, () => setCommunicationValues(blankCommunicationForm()))
          }
          onSave={() =>
            void submitSection("communication", buildCommunicationPayload(communicationValues), () => setCommunicationValues(blankCommunicationForm()))
          }
          providerLabel={status?.communicationProviderName}
          saveDisabled={!canSaveCommunication || isBusy}
          subtitle="Choose the provider first, then validate the credentials before they are stored."
          title="Calls & SMS"
          updatedAt={status?.communicationUpdatedAt}
        >
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Provider"}</FieldLabel>
            <NativeSelect
              disabled={isBusy}
              onChange={(value) =>
                setCommunicationValues((current) => applyCommunicationPreset(current, value as CommunicationFormValues["providerName"]))
              }
              options={[
                { label: "Twilio", value: "Twilio" },
                { label: "Plivo", value: "Plivo" },
                { label: "Custom", value: "Custom" },
              ]}
              value={communicationValues.providerName}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{communicationValues.providerName === "Plivo" ? "Auth ID" : "Account ID"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setCommunicationValues((current) => ({ ...current, accountId: event.target.value }))}
              placeholder={communicationValues.providerName === "Plivo" ? "MA..." : "AC..."}
              spellCheck={false}
              value={communicationValues.accountId}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Auth Token"}</FieldLabel>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setCommunicationValues((current) => ({ ...current, authToken: event.target.value }))}
              placeholder={`Enter a new ${communicationValues.providerName} auth token`}
              spellCheck={false}
              type="password"
              value={communicationValues.authToken}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"From Number"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setCommunicationValues((current) => ({ ...current, fromNumber: event.target.value }))}
              placeholder="+1 555 010 2000"
              value={communicationValues.fromNumber}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Validation URL / Base URL"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setCommunicationValues((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder={communicationValues.providerName === "Custom" ? "https://api.your-provider.com" : "Optional override"}
              spellCheck={false}
              type="url"
              value={communicationValues.baseUrl}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Voice Webhook URL"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setCommunicationValues((current) => ({ ...current, voiceWebhookUrl: event.target.value }))}
              placeholder="https://crm.example.com/api/lead-outreach/call-script"
              spellCheck={false}
              type="url"
              value={communicationValues.voiceWebhookUrl}
            />
            <p className="text-xs text-slate-500">
              {"Twilio can speak inline without this, but Plivo voice calls need a public callback URL that points to your lead outreach call-script endpoint."}
            </p>
          </label>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{"Enable SMS"}</p>
                <p className="text-xs text-slate-500">{"Store this provider as SMS-ready for reminders and lead follow-up."}</p>
              </div>
              <input
                checked={communicationValues.supportsSms}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                disabled={isBusy}
                onChange={(event) => setCommunicationValues((current) => ({ ...current, supportsSms: event.target.checked }))}
                type="checkbox"
              />
            </label>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{"Enable Voice"}</p>
                <p className="text-xs text-slate-500">{"Store this provider as call-ready for visit reminders and follow-ups."}</p>
              </div>
              <input
                checked={communicationValues.supportsVoice}
                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                disabled={isBusy}
                onChange={(event) => setCommunicationValues((current) => ({ ...current, supportsVoice: event.target.checked }))}
                type="checkbox"
              />
            </label>
          </div>
          <SectionError error={sectionErrors.communication} />
        </IntegrationCard>

        <IntegrationCard
          configured={status?.hasAiProviderConfig ?? false}
          description="Choose a hosted model provider or a local Ollama server, then save the model target you want the system to use."
          iconContainerClassName="bg-violet-50"
          iconClassName="text-violet-600"
          iconName="auto_awesome"
          isBusy={isBusy && pendingSection === "aiProvider"}
          onClear={() =>
            void submitSection("aiProvider", { clearAiProvider: true }, () => setAiProviderValues(blankAiProviderForm()))
          }
          onSave={() =>
            void submitSection("aiProvider", buildAiProviderPayload(aiProviderValues), () => setAiProviderValues(blankAiProviderForm()))
          }
          providerLabel={status?.aiProviderName}
          saveDisabled={!canSaveAiProvider || isBusy}
          subtitle="OpenAI, Ollama, or a custom endpoint with your own model name."
          title="AI Provider"
          updatedAt={status?.aiProviderUpdatedAt}
        >
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Provider"}</FieldLabel>
            <NativeSelect
              disabled={isBusy}
              onChange={(value) => setAiProviderValues((current) => applyAiProviderPreset(current, value as AiProviderFormValues["providerName"]))}
              options={[
                { label: "OpenAI", value: "OpenAI" },
                { label: "Ollama", value: "Ollama" },
                { label: "Custom", value: "Custom" },
              ]}
              value={aiProviderValues.providerName}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Base URL"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder={aiProviderValues.providerName === "Ollama" ? "http://localhost:11434" : "https://api.openai.com/v1"}
              spellCheck={false}
              type="url"
              value={aiProviderValues.baseUrl}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Model"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, model: event.target.value }))}
              placeholder={aiProviderValues.providerName === "Ollama" ? "llama3.2" : "gpt-5.4"}
              spellCheck={false}
              value={aiProviderValues.model}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{aiProviderValues.providerName === "Ollama" ? "API Key (Optional)" : "API Key"}</FieldLabel>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder={aiProviderValues.providerName === "Ollama" ? "Leave blank for local Ollama" : "Enter a provider API key"}
              spellCheck={false}
              type="password"
              value={aiProviderValues.apiKey}
            />
          </label>
          <SectionError error={sectionErrors.aiProvider} />
        </IntegrationCard>

        <IntegrationCard
          configured={status?.hasSmtpConfig ?? false}
          description="Save Gmail, Outlook, or custom mail details for sending mail, then optionally turn on mailbox sync so incoming email can be pulled into leads automatically."
          iconContainerClassName="bg-sky-50"
          iconClassName="text-sky-700"
          iconName="mail"
          isBusy={isBusy && pendingSection === "smtp"}
          onClear={() =>
            void submitSection("smtp", { clearSmtp: true }, () => setSmtpValues(blankSmtpForm()))
          }
          onSave={() =>
            void submitSection("smtp", buildSmtpPayload(smtpValues), () => setSmtpValues(blankSmtpForm()))
          }
          providerLabel={status?.smtpProviderName}
          saveDisabled={!canSaveSmtp || isBusy}
          subtitle="Gmail app passwords work here, and mailbox sync can reuse the same login automatically."
          title="SMTP Mail"
          updatedAt={status?.smtpUpdatedAt}
        >
          {status?.mailboxSyncEnabled ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {`Inbox sync is enabled${status.mailboxSyncIntervalMinutes ? ` every ${status.mailboxSyncIntervalMinutes} minutes` : ""}.`}
            </div>
          ) : null}
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Provider"}</FieldLabel>
            <NativeSelect
              disabled={isBusy}
              onChange={(value) => setSmtpValues((current) => applyMailPreset(current, value as SmtpFormValues["providerName"]))}
              options={[
                { label: "Gmail", value: "Gmail" },
                { label: "Outlook", value: "Outlook" },
                { label: "Custom", value: "Custom" },
              ]}
              value={smtpValues.providerName}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel>{"Host"}</FieldLabel>
              <Input
                autoComplete="off"
                className="rounded-xl border-slate-200 bg-slate-50"
                disabled={isBusy}
                onChange={(event) => setSmtpValues((current) => ({ ...current, host: event.target.value }))}
                placeholder="smtp.mailprovider.com"
                spellCheck={false}
                value={smtpValues.host}
              />
            </label>
            <label className="flex flex-col gap-2">
              <FieldLabel>{"Port"}</FieldLabel>
              <Input
                className="rounded-xl border-slate-200 bg-slate-50"
                disabled={isBusy}
                min="1"
                onChange={(event) => setSmtpValues((current) => ({ ...current, port: event.target.value }))}
                type="number"
                value={smtpValues.port}
              />
            </label>
          </div>
          <label className="flex flex-col gap-2">
            <FieldLabel>{"Username"}</FieldLabel>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, username: event.target.value }))}
              placeholder="notifications@agency.com"
              spellCheck={false}
              value={smtpValues.username}
            />
          </label>
          <label className="flex flex-col gap-2">
            <FieldLabel>{smtpValues.providerName === "Gmail" ? "App Password" : "Password"}</FieldLabel>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, password: event.target.value }))}
              placeholder={smtpValues.providerName === "Gmail" ? "Google app password" : "Enter SMTP password"}
              spellCheck={false}
              type="password"
              value={smtpValues.password}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex flex-col gap-2">
              <FieldLabel>{"From Email"}</FieldLabel>
              <Input
                autoComplete="off"
                className="rounded-xl border-slate-200 bg-slate-50"
                disabled={isBusy}
                onChange={(event) => setSmtpValues((current) => ({ ...current, fromEmail: event.target.value }))}
                placeholder="hello@agency.com"
                type="email"
                value={smtpValues.fromEmail}
              />
            </label>
            <label className="flex flex-col gap-2">
              <FieldLabel>{"From Name"}</FieldLabel>
              <Input
                autoComplete="off"
                className="rounded-xl border-slate-200 bg-slate-50"
                disabled={isBusy}
                onChange={(event) => setSmtpValues((current) => ({ ...current, fromName: event.target.value }))}
                placeholder="Skyline Real Estate"
                value={smtpValues.fromName}
              />
            </label>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{"Use SSL / TLS"}</p>
              <p className="text-xs text-slate-500">{"Port 587 + STARTTLS works well for Gmail and Outlook app-password setups."}</p>
            </div>
            <input
              checked={smtpValues.useSsl}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, useSsl: event.target.checked }))}
              type="checkbox"
            />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">{"Enable Mailbox Sync"}</p>
              <p className="text-xs text-slate-500">{"Pull inbound mail every 10-20 minutes and let the CRM match or create leads from those messages."}</p>
            </div>
            <input
              checked={smtpValues.enableInboxSync}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, enableInboxSync: event.target.checked }))}
              type="checkbox"
            />
          </label>
          {smtpValues.enableInboxSync ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-800">{"Mailbox Sync"}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {smtpValues.providerName === "Custom"
                    ? "Custom mailboxes can set their own mailbox host and login here."
                    : "For Gmail and Outlook, just enable mailbox access in the provider settings. This form reuses your same email login automatically behind the scenes."}
                </p>
                {status?.hasAiProviderConfig ? null : (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {"Set up an AI provider too. The inbox can still pull email, but auto-detecting property intent for brand-new senders depends on the LLM connection."}
                  </p>
                )}
              </div>
              {smtpValues.providerName === "Custom" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <FieldLabel>{"Mailbox Host"}</FieldLabel>
                      <Input
                        autoComplete="off"
                        className="rounded-xl border-slate-200 bg-white"
                        disabled={isBusy}
                        onChange={(event) => setSmtpValues((current) => ({ ...current, imapHost: event.target.value }))}
                        placeholder="imap.mailprovider.com"
                        spellCheck={false}
                        value={smtpValues.imapHost}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <FieldLabel>{"Mailbox Port"}</FieldLabel>
                      <Input
                        className="rounded-xl border-slate-200 bg-white"
                        disabled={isBusy}
                        min="1"
                        onChange={(event) => setSmtpValues((current) => ({ ...current, imapPort: event.target.value }))}
                        type="number"
                        value={smtpValues.imapPort}
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <FieldLabel>{"Mailbox Username"}</FieldLabel>
                      <Input
                        autoComplete="off"
                        className="rounded-xl border-slate-200 bg-white"
                        disabled={isBusy}
                        onChange={(event) => setSmtpValues((current) => ({ ...current, imapUsername: event.target.value }))}
                        placeholder="Leave blank to reuse mail username"
                        spellCheck={false}
                        value={smtpValues.imapUsername}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <FieldLabel>{"Mailbox Password"}</FieldLabel>
                      <Input
                        autoComplete="new-password"
                        className="rounded-xl border-slate-200 bg-white"
                        disabled={isBusy}
                        onChange={(event) => setSmtpValues((current) => ({ ...current, imapPassword: event.target.value }))}
                        placeholder="Leave blank to reuse mail password"
                        spellCheck={false}
                        type="password"
                        value={smtpValues.imapPassword}
                      />
                    </label>
                  </div>
                  <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{"Use Mailbox SSL / TLS"}</p>
                      <p className="text-xs text-slate-500">{"Port 993 usually uses direct SSL."}</p>
                    </div>
                    <input
                      checked={smtpValues.imapUseSsl}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      disabled={isBusy}
                      onChange={(event) => setSmtpValues((current) => ({ ...current, imapUseSsl: event.target.checked }))}
                      type="checkbox"
                    />
                  </label>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {smtpValues.providerName === "Gmail"
                    ? "Gmail mailbox sync will use Gmail's standard mailbox server automatically after mailbox access is enabled in Gmail settings."
                    : "Outlook mailbox sync will use outlook.office365.com automatically with the same mailbox login."}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <FieldLabel>{"Inbox Folder"}</FieldLabel>
                  <Input
                    autoComplete="off"
                    className="rounded-xl border-slate-200 bg-white"
                    disabled={isBusy}
                    onChange={(event) => setSmtpValues((current) => ({ ...current, imapFolder: event.target.value }))}
                    placeholder="INBOX"
                    spellCheck={false}
                    value={smtpValues.imapFolder}
                  />
                </label>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600">
                  {"Incoming email is checked with mailbox sync. Outgoing email is sent with SMTP. They are separate behind the scenes, but you only need one setup here."}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <FieldLabel>{"Sync Every (Minutes)"}</FieldLabel>
                  <Input
                    className="rounded-xl border-slate-200 bg-white"
                    disabled={isBusy}
                    min="5"
                    onChange={(event) => setSmtpValues((current) => ({ ...current, syncIntervalMinutes: event.target.value }))}
                    type="number"
                    value={smtpValues.syncIntervalMinutes}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <FieldLabel>{"Max Emails Per Sync"}</FieldLabel>
                  <Input
                    className="rounded-xl border-slate-200 bg-white"
                    disabled={isBusy}
                    min="5"
                    onChange={(event) => setSmtpValues((current) => ({ ...current, maxMessagesPerSync: event.target.value }))}
                    type="number"
                    value={smtpValues.maxMessagesPerSync}
                  />
                </label>
              </div>
            </div>
          ) : null}
          <SectionError error={sectionErrors.smtp} />
        </IntegrationCard>
      </div>
    </div>
  )
}
