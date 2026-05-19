import { AppIcon } from "@/components/ui/app-icon"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

import { leadFieldOptions } from "./constants"
import type {
  CampaignStudioState,
  CsvPreviewState,
  FeedbackState,
  LeadFieldKey,
  OutreachKind,
} from "./types"
import { ChannelComposerCard, FeedbackBox, Field, SectionIntro, StatusBadge, StepBlock, buildImportSummary } from "./utils"
import type {
  AgencyCommunicationTemplateItem,
  LeadCampaignImportBatch,
} from "@/@types/real-estate-api"

export function CampaignTab({
  campaignError,
  campaignFeedback,
  campaignStudio,
  campaignTokens,
  createImportPending,
  csvPreview,
  importHistory,
  onCampaignChange,
  onCsvUpload,
  onLeadFieldChange,
  onSubmit,
  onTemplateApply,
  onVariableMappingChange,
  templates,
}: {
  campaignError: string | null
  campaignFeedback: FeedbackState | null
  campaignStudio: CampaignStudioState
  campaignTokens: string[]
  createImportPending: boolean
  csvPreview: CsvPreviewState
  importHistory: LeadCampaignImportBatch[]
  onCampaignChange: (updater: (current: CampaignStudioState) => CampaignStudioState) => void
  onCsvUpload: (file: File) => Promise<void>
  onLeadFieldChange: (key: LeadFieldKey, value: string) => void
  onSubmit: () => Promise<void>
  onTemplateApply: (templateId: string) => void
  onVariableMappingChange: (token: string, value: string) => void
  templates: AgencyCommunicationTemplateItem[]
}) {
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.75fr)]">
      <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <SectionIntro
                eyebrow="Bulk workflow"
                helper="Work left to right: upload list, map columns, choose template, choose channels, schedule follow-up."
                title="Campaign Studio"
              />
            </div>
            <div className="rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
              {"Best for bulk Email + SMS"}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 py-6">
          <StepBlock number="1" title="Upload CSV">
            <div className="flex flex-col gap-4 rounded-[1.6rem] border border-dashed border-primary/35 bg-primary/5 p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">{csvPreview.fileName || "No CSV uploaded yet"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {csvPreview.rows.length > 0
                    ? `${csvPreview.rows.length} rows and ${csvPreview.headers.length} columns detected`
                    : "CSV should include at least one email column."}
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
                <AppIcon className="text-base" name="upload" />
                <span>{"Upload CSV"}</span>
                <input
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void onCsvUpload(file)
                    }
                  }}
                  type="file"
                />
              </label>
            </div>

            {csvPreview.headers.length > 0 ? (
              <div className="rounded-[1.6rem] border border-border bg-background p-4">
                <div className="flex flex-wrap gap-2">
                  {csvPreview.headers.map((header) => (
                    <span
                      key={header}
                      className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </StepBlock>

          <div className="grid gap-6 xl:grid-cols-2">
            <StepBlock number="2" title="Campaign Setup">
              <div className="grid gap-4">
                <Field label="Campaign name">
                  <Input
                    className="rounded-2xl"
                    onChange={(event) => onCampaignChange((current) => ({ ...current, batchName: event.target.value }))}
                    placeholder="May downtown buyers"
                    value={campaignStudio.batchName}
                  />
                </Field>
                <Field label="Saved template">
                  <select
                    className="h-11 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                    onChange={(event) => onTemplateApply(event.target.value)}
                    value={campaignStudio.templateId}
                  >
                    <option value="">{"Custom message"}</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </StepBlock>

            <StepBlock number="3" title="Field Mapping">
              <div className="grid gap-3">
                {leadFieldOptions.map((field) => (
                  <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`}>
                    <select
                      className="h-10 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                      onChange={(event) => onLeadFieldChange(field.key, event.target.value)}
                      value={campaignStudio.leadFieldMappings[field.key]}
                    >
                      <option value="">{"Not mapped"}</option>
                      {csvPreview.headers.map((header) => (
                        <option key={`${field.key}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            </StepBlock>
          </div>

          <StepBlock number="4" title="Variable Mapping">
            {campaignTokens.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {campaignTokens.map((token) => (
                  <Field key={token} label={token}>
                    <select
                      className="h-10 rounded-2xl border border-input bg-background px-3 text-sm font-semibold text-foreground"
                      onChange={(event) => onVariableMappingChange(token, event.target.value)}
                      value={campaignStudio.variableMappings[token] ?? ""}
                    >
                      <option value="">{"Auto/default"}</option>
                      {csvPreview.headers.map((header) => (
                        <option key={`${token}-${header}`} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-border bg-background px-4 py-4 text-sm font-semibold text-muted-foreground">
                {"No variable tokens yet. Pick saved template or type tokens like {{client_name}} in message."}
              </div>
            )}
          </StepBlock>

          <div className="grid gap-6 2xl:grid-cols-2">
            <ChannelComposerCard
              activeKinds={campaignStudio.initialKinds}
              body={campaignStudio.initialMessage}
              heading="Initial Touch"
              isEnabled
              onBodyChange={(value) => onCampaignChange((current) => ({ ...current, initialMessage: value }))}
              onKindsChange={(nextKinds) => onCampaignChange((current) => ({ ...current, initialKinds: nextKinds }))}
              onScheduleChange={(value) => onCampaignChange((current) => ({ ...current, initialScheduledAt: value }))}
              onTitleChange={(value) => onCampaignChange((current) => ({ ...current, initialTitle: value }))}
              scheduleAt={campaignStudio.initialScheduledAt}
              title={campaignStudio.initialTitle}
            />
            <ChannelComposerCard
              activeKinds={campaignStudio.followUpKinds}
              body={campaignStudio.followUpMessage}
              heading="Follow-Up"
              isEnabled={campaignStudio.enableFollowUp}
              onBodyChange={(value) => onCampaignChange((current) => ({ ...current, followUpMessage: value }))}
              onEnabledChange={(checked) => onCampaignChange((current) => ({ ...current, enableFollowUp: checked }))}
              onKindsChange={(nextKinds) => onCampaignChange((current) => ({ ...current, followUpKinds: nextKinds }))}
              onScheduleChange={(value) => onCampaignChange((current) => ({ ...current, followUpScheduledAt: value }))}
              onTitleChange={(value) => onCampaignChange((current) => ({ ...current, followUpTitle: value }))}
              scheduleAt={campaignStudio.followUpScheduledAt}
              title={campaignStudio.followUpTitle}
            />
          </div>

          <FeedbackBox error={campaignError} feedback={campaignFeedback} />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-border bg-background px-4 py-4">
            <p className="text-sm text-muted-foreground">
              {"Tip: choose Email + SMS together if both should be created from same CSV upload."}
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground disabled:opacity-60"
              disabled={createImportPending}
              onClick={() => void onSubmit()}
              type="button"
            >
              <AppIcon className="text-base" name="publish" />
              {createImportPending ? "Saving..." : "Import And Queue"}
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">{"Quick Guide"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-[1.4rem] border border-border/70 bg-background px-4 py-4">
              <p>{"1. Save or choose template."}</p>
              <p>{"2. Upload CSV and confirm mapping."}</p>
              <p>{"3. Queue first touch and optional follow-up."}</p>
            </div>
            <div className="rounded-[1.4rem] border border-accent/25 bg-accent/8 px-4 py-4 text-foreground">
              {"Follow-up auto-skip runs when same email or phone already replied."}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,241,0.9))] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-black">{"Recent Imports"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {importHistory.length === 0 ? (
              <p className="text-sm font-semibold text-muted-foreground">{"No import yet."}</p>
            ) : (
              importHistory.map((batch) => <ImportHistoryCard batch={batch} key={batch.id} />)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ImportHistoryCard({ batch }: { batch: LeadCampaignImportBatch }) {
  return (
    <div className="rounded-[1.6rem] border border-border/70 bg-background px-4 py-4 transition-colors duration-200 hover:border-primary/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-foreground">{batch.batchName}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{batch.templateName}</p>
        </div>
        <StatusBadge status={batch.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{buildImportSummary(batch)}</p>
    </div>
  )
}
