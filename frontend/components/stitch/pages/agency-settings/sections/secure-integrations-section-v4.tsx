"use client"

import type { ComponentProps } from "react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAgencyIntegrationSettings } from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel } from "@/lib/admin-portal"

import { IntegrationAiSheet } from "./integration-ai-sheet"
import { IntegrationCommunicationSheet } from "./integration-communication-sheet"
import { IntegrationMailSheet } from "./integration-mail-sheet"

type CommunicationConfig = ComponentProps<
  typeof IntegrationCommunicationSheet
>["config"]
type MailConfig = ComponentProps<typeof IntegrationMailSheet>["config"]
type AiConfig = ComponentProps<typeof IntegrationAiSheet>["config"]

type WorkspaceStatus = {
  hasCommunicationConfig: boolean
  communicationUpdatedAt?: string | null
  communicationProviderName?: string | null
  communicationSmsSyncEnabled?: boolean
  communicationSmsSyncIntervalMinutes?: number | null
  communicationConfig?: CommunicationConfig
  hasSmtpConfig: boolean
  smtpUpdatedAt?: string | null
  smtpProviderName?: string | null
  mailboxSyncEnabled: boolean
  mailboxSyncIntervalMinutes?: number | null
  smtpConfig?: MailConfig
  hasAiProviderConfig: boolean
  aiProviderUpdatedAt?: string | null
  aiProviderName?: string | null
  aiProviderConfig?: AiConfig
}

type ActiveEditor = "communication" | "smtp" | "ai" | null

export function SecureIntegrationsSectionV4() {
  const query = useAgencyIntegrationSettings()
  const status = query.data as WorkspaceStatus | undefined
  const [active, setActive] = useState<ActiveEditor>(null)

  return (
    <section className="space-y-4" id="integrations">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{"Integrations"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {"Cards show usable configuration. Secret values stay write-only and are preserved when left blank."}
        </p>
      </div>

      {query.error ? (
        <Alert variant="destructive">
          <AlertDescription>{query.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusCard
          configured={status?.hasCommunicationConfig ?? false}
          description="Calls, SMS reminders, inbound sync, and provider webhooks."
          icon="phone_in_talk"
          onOpen={() => setActive("communication")}
          provider={status?.communicationProviderName}
          syncLabel={
            status?.communicationSmsSyncEnabled
              ? `Every ${status.communicationSmsSyncIntervalMinutes ?? 5} min`
              : "Webhook / manual"
          }
          title="Calls and SMS"
          updatedAt={status?.communicationUpdatedAt}
        />
        <StatusCard
          configured={status?.hasSmtpConfig ?? false}
          description="SMTP sending with optional inbox synchronization and lead creation."
          icon="mail"
          onOpen={() => setActive("smtp")}
          provider={status?.smtpProviderName}
          syncLabel={
            status?.mailboxSyncEnabled
              ? `Every ${status.mailboxSyncIntervalMinutes ?? 10} min`
              : "Sending only"
          }
          title="Email and inbox"
          updatedAt={status?.smtpUpdatedAt}
        />
        <StatusCard
          configured={status?.hasAiProviderConfig ?? false}
          description="Feedback classification, summaries, and compatible AI workflows."
          icon="auto_awesome"
          onOpen={() => setActive("ai")}
          provider={status?.aiProviderName}
          syncLabel="On demand"
          title="AI provider"
          updatedAt={status?.aiProviderUpdatedAt}
        />
      </div>

      <IntegrationCommunicationSheet
        config={status?.communicationConfig}
        onOpenChange={(open) => setActive(open ? "communication" : null)}
        open={active === "communication"}
      />
      <IntegrationMailSheet
        config={status?.smtpConfig}
        onOpenChange={(open) => setActive(open ? "smtp" : null)}
        open={active === "smtp"}
      />
      <IntegrationAiSheet
        config={status?.aiProviderConfig}
        onOpenChange={(open) => setActive(open ? "ai" : null)}
        open={active === "ai"}
      />
    </section>
  )
}

function StatusCard({
  configured,
  description,
  icon,
  onOpen,
  provider,
  syncLabel,
  title,
  updatedAt,
}: {
  configured: boolean
  description: string
  icon: string
  onOpen: () => void
  provider?: string | null
  syncLabel: string
  title: string
  updatedAt?: string | null
}) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border bg-muted/30 text-foreground">
            <AppIcon name={icon} />
          </span>
          <Badge variant={configured ? "secondary" : "outline"}>
            {configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="mt-1 leading-5">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-2 text-sm">
          <StatusRow label="Provider" value={provider || "Not selected"} />
          <StatusRow label="Sync" value={syncLabel} />
          <StatusRow
            label="Updated"
            value={updatedAt ? formatDateTimeLabel(updatedAt) : "Never"}
          />
        </dl>
        <Button
          className="w-full"
          onClick={onOpen}
          type="button"
          variant={configured ? "outline" : "default"}
        >
          {configured ? "Manage connection" : "Configure"}
        </Button>
      </CardContent>
    </Card>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  )
}
