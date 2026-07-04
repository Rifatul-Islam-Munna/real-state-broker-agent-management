"use client"

import type { LeadCollectionTemplateSaveInput } from "@/@types/lead-collection-template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { applyZillowTemplatePreset, splitTemplateList } from "./editor-utils"

export function LinkedPageSettings({
  template,
  onChange,
  onPrepare,
  preparing,
}: {
  template: LeadCollectionTemplateSaveInput
  onChange: (value: LeadCollectionTemplateSaveInput) => void
  onPrepare: () => void
  preparing: boolean
}) {
  const config = template.linkedPageConfig
  const loaded = Boolean(template.linkedPageSourceText.trim())

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Open a detail-page link</CardTitle>
            <CardDescription className="mt-2 max-w-xl">
              Use this when the email contains a button or link, while the contact name,
              phone number, or property address is on the page behind that link.
              Configure it once for each provider; future matching emails use it automatically.
            </CardDescription>
          </div>
          <Button
            onClick={() => onChange(applyZillowTemplatePreset(template))}
            type="button"
            variant="outline"
          >
            <AppIcon name="home_work" />
            Apply Zillow preset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-3 rounded-xl border p-4">
          <input
            checked={config.enabled}
            className="mt-1"
            onChange={(event) =>
              onChange({
                ...template,
                linkedPageConfig: { ...config, enabled: event.target.checked },
              })
            }
            type="checkbox"
          />
          <span>
            <span className="block text-sm font-semibold">
              Open a matching link from this provider&apos;s email
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              This is disabled by default. The system only opens HTTPS websites listed below.
            </span>
          </span>
        </label>

        {config.enabled ? (
          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <label className="space-y-2 text-sm font-medium">
              <span>Allowed website hosts *</span>
              <Input
                onChange={(event) =>
                  onChange({
                    ...template,
                    linkedPageConfig: {
                      ...config,
                      allowedHosts: splitTemplateList(event.target.value),
                    },
                  })
                }
                placeholder="zillow.com, *.zillow.com, leads.example.com"
                value={config.allowedHosts.join(", ")}
              />
              <span className="block text-xs font-normal leading-5 text-muted-foreground">
                Required for safety. Add the exact provider domain or use a wildcard for its
                subdomains. Other websites will not be opened.
              </span>
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span>Link URL contains</span>
              <Input
                onChange={(event) =>
                  onChange({
                    ...template,
                    linkedPageConfig: {
                      ...config,
                      urlIncludes: splitTemplateList(event.target.value),
                    },
                  })
                }
                placeholder="lead, detail, inquiry"
                value={config.urlIncludes.join(", ")}
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Optional words used to choose the correct link when the email contains several links.
              </span>
            </label>

            <label className="space-y-2 text-sm font-medium">
              <span>Button or link text contains</span>
              <Input
                onChange={(event) =>
                  onChange({
                    ...template,
                    linkedPageConfig: {
                      ...config,
                      linkTextIncludes: splitTemplateList(event.target.value),
                    },
                  })
                }
                placeholder="View lead, View details"
                value={config.linkTextIncludes.join(", ")}
              />
              <span className="block text-xs font-normal text-muted-foreground">
                Optional. Leave empty when the provider changes the button wording frequently.
              </span>
            </label>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={preparing}
          onClick={onPrepare}
          type="button"
        >
          <AppIcon name="auto_awesome" />
          {preparing ? "Preparing sample..." : "Prepare email and detail page"}
        </Button>

        {config.enabled && template.sourceText ? (
          <Alert variant={loaded ? "default" : "destructive"}>
            <AlertDescription>
              {loaded
                ? `Detail page loaded successfully: ${template.linkedPageSampleUrl}`
                : "No matching public detail page was loaded. Check the allowed host and link filters, then prepare the sample again."}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">
          <strong className="text-foreground">Zillow setup:</strong> create or open a Zillow
          template, apply the preset, choose a real Zillow email from the inbox, and press
          “Prepare email and detail page.” You do not configure Zillow globally, and you do
          not repeat this for every email.
        </div>
      </CardContent>
    </Card>
  )
}
