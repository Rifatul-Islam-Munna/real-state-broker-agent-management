"use client"

import type { LeadCollectionTemplateSaveInput } from "@/@types/lead-collection-template"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { applyZillowTemplatePreset, linkedPageConfigForUrl } from "./editor-utils"

type ContactMode = "email" | "url" | "page"

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
  const [manualUrl, setManualUrl] = useState(config.selectedUrl ?? "")
  const mode: ContactMode = !config.enabled ? "email" : config.openPage === false ? "url" : "page"
  const loaded = Boolean(template.linkedPageSourceText.trim())

  function setContactMode(nextMode: ContactMode) {
    onChange({
      ...template,
      linkedPageConfig:
        nextMode === "email"
          ? {
              ...config,
              enabled: false,
              selectedUrl: undefined,
              openPage: true,
            }
          : {
              ...config,
              enabled: true,
              openPage: nextMode === "page",
            },
      linkedPageSampleUrl: "",
      linkedPageSourceHtml: "",
      linkedPageSourceText: "",
    })
  }

  function useManualUrl() {
    const cleanUrl = manualUrl.trim()
    if (!cleanUrl) return
    onChange({
      ...template,
      linkedPageConfig: linkedPageConfigForUrl(cleanUrl, "", mode === "page"),
      linkedPageSampleUrl: "",
      linkedPageSourceHtml: "",
      linkedPageSourceText: "",
    })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Where is contact info?</CardTitle>
            <CardDescription className="mt-1 text-xs">
              Pick one. Extra boxes show only when needed.
            </CardDescription>
          </div>
          <Button
            onClick={() =>
              onChange({
                ...applyZillowTemplatePreset(template),
                linkedPageSampleUrl: "",
                linkedPageSourceHtml: "",
                linkedPageSourceText: "",
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            <AppIcon name="home_work" />
            Zillow
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          <ModeButton
            active={mode === "email"}
            icon="mail"
            label="Inside email"
            onClick={() => setContactMode("email")}
            text="Name/phone/address are visible in the email."
          />
          <ModeButton
            active={mode === "url"}
            icon="link"
            label="Inside button URL"
            onClick={() => setContactMode("url")}
            text="Button link has name= or phone=. No page open."
          />
          <ModeButton
            active={mode === "page"}
            icon="open_in_new"
            label="On page after button"
            onClick={() => setContactMode("page")}
            text="Button opens another page with the info."
          />
        </div>

        {mode !== "email" ? (
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-sm font-semibold">Button or URL</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Easiest: highlight the button text in Map fields, then click "Use as contact button".
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="Paste link if you have it"
                value={manualUrl}
              />
              <Button disabled={!manualUrl.trim()} onClick={useManualUrl} type="button" variant="outline">
                Use URL
              </Button>
            </div>
            {config.selectedUrl ? (
              <p className="mt-2 truncate text-xs text-muted-foreground">
                Selected: {config.selectedUrl}
              </p>
            ) : null}
            <label className="mt-3 flex items-start gap-2 rounded-md border bg-background p-2 text-sm">
              <input
                checked={config.autoFillContactFields !== false}
                className="mt-1"
                onChange={(event) =>
                  onChange({
                    ...template,
                    linkedPageConfig: {
                      ...config,
                      autoFillContactFields: event.target.checked,
                    },
                  })
                }
                type="checkbox"
              />
              <span>
                <span className="block font-medium">Auto-fill Name, Phone, Email</span>
                <span className="block text-xs text-muted-foreground">
                  Turn off if you want to map and remove every field yourself.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <Button
          className="w-full"
          disabled={preparing || (mode !== "email" && Boolean(template.sourceText) && !config.selectedUrl)}
          onClick={onPrepare}
          type="button"
        >
          <AppIcon name="auto_awesome" />
          {preparing
            ? "Working..."
            : !template.sourceText
              ? "Load sample"
              : mode === "email"
                ? "Prepare email"
                : "Extract from button"}
        </Button>

        {mode !== "email" && template.sourceText ? (
          <Alert variant={loaded ? "default" : "destructive"}>
            <AlertDescription>
              {loaded
                ? "Button data loaded. Map values from Selected button / URL."
                : "Select a button in Map fields, or paste URL here."}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
  text,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
  text: string
}) {
  return (
    <button
      className={`rounded-lg border p-3 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "bg-background hover:border-primary"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <AppIcon name={active ? "check_circle" : icon} />
        {label}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{text}</span>
    </button>
  )
}
