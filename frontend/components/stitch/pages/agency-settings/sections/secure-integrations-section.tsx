"use client"

import { type ReactNode, useState } from "react"

import type { UpdateAgencyIntegrationSettingsInput } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { useAgencyIntegrationSettings, useUpdateAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

type SectionKey = "twilio" | "aiProvider" | "smtp"

type TwilioFormValues = {
  accountSid: string
  authToken: string
  fromNumber: string
}

type AiProviderFormValues = {
  providerName: string
  baseUrl: string
  model: string
  apiKey: string
}

type SmtpFormValues = {
  host: string
  port: string
  username: string
  password: string
  fromEmail: string
  fromName: string
  useSsl: boolean
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
  saveDisabled: boolean
  subtitle: string
  title: string
  updatedAt?: string | null
}

const blankTwilioForm = (): TwilioFormValues => ({
  accountSid: "",
  authToken: "",
  fromNumber: "",
})

const blankAiProviderForm = (): AiProviderFormValues => ({
  providerName: "",
  baseUrl: "",
  model: "",
  apiKey: "",
})

const blankSmtpForm = (): SmtpFormValues => ({
  host: "",
  port: "587",
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
  useSsl: true,
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
          {isBusy ? "Saving..." : "Save"}
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

function trimValue(value: string) {
  return value.trim()
}

function buildTwilioPayload(values: TwilioFormValues): UpdateAgencyIntegrationSettingsInput {
  return {
    twilio: {
      accountSid: trimValue(values.accountSid),
      authToken: trimValue(values.authToken),
      fromNumber: trimValue(values.fromNumber),
    },
  }
}

function buildAiProviderPayload(values: AiProviderFormValues): UpdateAgencyIntegrationSettingsInput {
  const baseUrl = trimValue(values.baseUrl)

  return {
    aiProvider: {
      apiKey: trimValue(values.apiKey),
      baseUrl: baseUrl || undefined,
      model: trimValue(values.model),
      providerName: trimValue(values.providerName),
    },
  }
}

function buildSmtpPayload(values: SmtpFormValues): UpdateAgencyIntegrationSettingsInput {
  const fromName = trimValue(values.fromName)

  return {
    smtp: {
      fromEmail: trimValue(values.fromEmail),
      fromName: fromName || undefined,
      host: trimValue(values.host),
      password: trimValue(values.password),
      port: Math.max(1, Number(values.port) || 0),
      useSsl: values.useSsl,
      username: trimValue(values.username),
    },
  }
}

export function SecureIntegrationsSection() {
  const integrationStatusQuery = useAgencyIntegrationSettings()
  const updateMutation = useUpdateAgencyIntegrationSettings()

  const [aiProviderValues, setAiProviderValues] = useState<AiProviderFormValues>(() => blankAiProviderForm())
  const [pendingSection, setPendingSection] = useState<SectionKey | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<SectionKey, string | null>>({
    aiProvider: null,
    smtp: null,
    twilio: null,
  })
  const [smtpValues, setSmtpValues] = useState<SmtpFormValues>(() => blankSmtpForm())
  const [twilioValues, setTwilioValues] = useState<TwilioFormValues>(() => blankTwilioForm())

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
        const message = response.error.message || "Failed to update this integration."

        setSectionErrors((current) => ({
          ...current,
          [section]: message,
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

  const canSaveTwilio =
    trimValue(twilioValues.accountSid).length > 0 &&
    trimValue(twilioValues.authToken).length > 0 &&
    trimValue(twilioValues.fromNumber).length > 0

  const canSaveAiProvider =
    trimValue(aiProviderValues.providerName).length > 0 &&
    trimValue(aiProviderValues.model).length > 0 &&
    trimValue(aiProviderValues.apiKey).length > 0

  const smtpPort = Number(smtpValues.port)
  const canSaveSmtp =
    trimValue(smtpValues.host).length > 0 &&
    trimValue(smtpValues.username).length > 0 &&
    trimValue(smtpValues.password).length > 0 &&
    trimValue(smtpValues.fromEmail).length > 0 &&
    Number.isFinite(smtpPort) &&
    smtpPort > 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-4">
        <div className="flex items-start gap-3">
          <AppIcon className="mt-0.5 text-lg text-amber-700" name="settings" />
          <div>
            <p className="text-sm font-bold text-amber-900">{"Write-only integration vault"}</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              {"These credentials are saved on the server, encrypted there, and never returned to the admin panel again."}
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
          configured={status?.hasTwilioConfig ?? false}
          description="Send SMS alerts, lead follow-ups, and call triggers with your Twilio account."
          iconContainerClassName="bg-red-50"
          iconClassName="text-red-600"
          iconName="sms"
          isBusy={isBusy && pendingSection === "twilio"}
          onClear={() => void submitSection("twilio", { clearTwilio: true }, () => setTwilioValues(blankTwilioForm()))}
          onSave={() => void submitSection("twilio", buildTwilioPayload(twilioValues), () => setTwilioValues(blankTwilioForm()))}
          saveDisabled={!canSaveTwilio || isBusy}
          subtitle="Write only. Save to overwrite the stored secret."
          title="Twilio"
          updatedAt={status?.twilioUpdatedAt}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Account SID"}</span>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setTwilioValues((current) => ({ ...current, accountSid: event.target.value }))}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              spellCheck={false}
              value={twilioValues.accountSid}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Auth Token"}</span>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setTwilioValues((current) => ({ ...current, authToken: event.target.value }))}
              placeholder="Enter a new Twilio auth token"
              spellCheck={false}
              type="password"
              value={twilioValues.authToken}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"From Number"}</span>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setTwilioValues((current) => ({ ...current, fromNumber: event.target.value }))}
              placeholder="+1 555 010 2000"
              value={twilioValues.fromNumber}
            />
          </label>
          <SectionError error={sectionErrors.twilio} />
        </IntegrationCard>

        <IntegrationCard
          configured={status?.hasAiProviderConfig ?? false}
          description="Store a third-party AI API key and model target for automation, copilots, or content workflows."
          iconContainerClassName="bg-violet-50"
          iconClassName="text-violet-600"
          iconName="auto_awesome"
          isBusy={isBusy && pendingSection === "aiProvider"}
          onClear={() => void submitSection("aiProvider", { clearAiProvider: true }, () => setAiProviderValues(blankAiProviderForm()))}
          onSave={() => void submitSection("aiProvider", buildAiProviderPayload(aiProviderValues), () => setAiProviderValues(blankAiProviderForm()))}
          saveDisabled={!canSaveAiProvider || isBusy}
          subtitle="API keys never come back to the browser after save."
          title="AI Provider"
          updatedAt={status?.aiProviderUpdatedAt}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Provider Name"}</span>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, providerName: event.target.value }))}
              placeholder="OpenAI"
              value={aiProviderValues.providerName}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Base URL"}</span>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, baseUrl: event.target.value }))}
              placeholder="https://api.openai.com/v1"
              spellCheck={false}
              type="url"
              value={aiProviderValues.baseUrl}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"Model"}</span>
            <Input
              autoComplete="off"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, model: event.target.value }))}
              placeholder="gpt-5.4"
              spellCheck={false}
              value={aiProviderValues.model}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-bold text-slate-700">{"API Key"}</span>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setAiProviderValues((current) => ({ ...current, apiKey: event.target.value }))}
              placeholder="Enter a new provider API key"
              spellCheck={false}
              type="password"
              value={aiProviderValues.apiKey}
            />
          </label>
          <SectionError error={sectionErrors.aiProvider} />
        </IntegrationCard>

        <IntegrationCard
          configured={status?.hasSmtpConfig ?? false}
          description="Manage transactional mail delivery for inquiries, alerts, and automated email handoffs."
          iconContainerClassName="bg-sky-50"
          iconClassName="text-sky-700"
          iconName="mail"
          isBusy={isBusy && pendingSection === "smtp"}
          onClear={() => void submitSection("smtp", { clearSmtp: true }, () => setSmtpValues(blankSmtpForm()))}
          onSave={() => void submitSection("smtp", buildSmtpPayload(smtpValues), () => setSmtpValues(blankSmtpForm()))}
          saveDisabled={!canSaveSmtp || isBusy}
          subtitle="Write only mail credentials with optional sender name."
          title="SMTP Mail"
          updatedAt={status?.smtpUpdatedAt}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"Host"}</span>
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
              <span className="text-sm font-bold text-slate-700">{"Port"}</span>
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
            <span className="text-sm font-bold text-slate-700">{"Username"}</span>
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
            <span className="text-sm font-bold text-slate-700">{"Password"}</span>
            <Input
              autoComplete="new-password"
              className="rounded-xl border-slate-200 bg-slate-50"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, password: event.target.value }))}
              placeholder="Enter a new SMTP password"
              spellCheck={false}
              type="password"
              value={smtpValues.password}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">{"From Email"}</span>
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
              <span className="text-sm font-bold text-slate-700">{"From Name"}</span>
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
              <p className="text-xs text-slate-500">{"Enable secure SMTP transport for the stored mail connection."}</p>
            </div>
            <input
              checked={smtpValues.useSsl}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              disabled={isBusy}
              onChange={(event) => setSmtpValues((current) => ({ ...current, useSsl: event.target.checked }))}
              type="checkbox"
            />
          </label>
          <SectionError error={sectionErrors.smtp} />
        </IntegrationCard>
      </div>
    </div>
  )
}
