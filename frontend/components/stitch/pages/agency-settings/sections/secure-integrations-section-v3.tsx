"use client"

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

type WorkspaceStatus = {
  hasCommunicationConfig: boolean
  communicationUpdatedAt?: string | null
  communicationProviderName?: string | null
  communicationSmsSyncEnabled?: boolean
  communicationSmsSyncIntervalMinutes?: number | null
  communicationConfig?: Record<string, unknown> | null
  hasSmtpConfig: boolean
  smtpUpdatedAt?: string | null
  smtpProviderName?: string | null
  mailboxSyncEnabled: boolean
  mailboxSyncIntervalMinutes?: number | null
  smtpConfig?: Record<string, unknown> | null
  hasAiProviderConfig: boolean
  aiProviderUpdatedAt?: string | null
  aiProviderName?: string | null
  aiProviderConfig?: Record<string, unknown> | null
}

type ActiveEditor = "communication" | "smtp" | "ai" | null

export function SecureIntegrationsSectionV3() {
  const query = useAgencyIntegrationSettings()
  const status = query.data as WorkspaceStatus | undefined
  const [active, setActive] = useState<ActiveEditor>(null)

  return (
    <section className="space-y-4" id="integrations">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{"Integrations"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {"Cards show the current usable configuration. Secret values stay write-only and are preserved when their fields are left blank."}
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
          description="Calls, SMS reminders, inbound SMS synchronization, and provider webhooks."
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
          description="SMTP sending with optional IMAP inbox synchronization and lead creation."
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
          description="Feedback classification, report summaries, and compatible AI workflows."
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
    <Card className="shadow-none">
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
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Provider"}</dt>
            <dd className="font-medium text-foreground">{provider || "Not selected"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Sync"}</dt>
            <dd className="text-right font-medium text-foreground">{syncLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">{"Updated"}</dt>
            <dd className="text-right text-xs font-medium text-foreground">
              {updatedAt ? formatDateTimeLabel(updatedAt) : "Never"}
            </dd>
          </div>
        </dl>
        <Button className="w-full" onClick={onOpen} type="button" variant={configured ? "outline" : "default"}>
          {configured ? "Manage connection" : "Configure"}
        </Button>
      </CardContent>
    </Card>
  )
}
