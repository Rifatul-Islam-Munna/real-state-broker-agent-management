"use client"

import type { ReactNode } from "react"

import type { RealtorShowingAutomationInput } from "@/@types/real-estate-api"
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

export type ShowingAutomationEditor = RealtorShowingAutomationInput & {
  realtorName: string
}

type TemplateOption = { id: string; name: string }

type Props = {
  directTemplates: TemplateOption[]
  editor: ShowingAutomationEditor | null
  followUpTemplates: TemplateOption[]
  isSaving: boolean
  onChange: (value: ShowingAutomationEditor | null) => void
  onClose: () => void
  onSave: () => void
  timeZone: string
}

export function RealtorShowingAutomationSheetV2(props: Props) {
  const {
    directTemplates,
    editor,
    followUpTemplates,
    isSaving,
    onChange,
    onClose,
    onSave,
    timeZone,
  } = props

  function patch(update: Partial<ShowingAutomationEditor>) {
    onChange(editor ? { ...editor, ...update } : null)
  }

  const date = editor?.outreachAt?.slice(0, 10) ?? ""
  const time = editor?.outreachAt?.slice(11, 16) ?? ""

  function updateDateTime(nextDate: string, nextTime: string) {
    patch({ outreachAt: nextDate && nextTime ? `${nextDate}T${nextTime}` : "" })
  }

  return (
    <Sheet open={editor !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:w-[34rem] sm:max-w-[34rem]">
        <SheetHeader className="border-b">
          <SheetTitle>{"Showing schedule"}</SheetTitle>
          <SheetDescription>
            {editor
              ? `Update delivery and follow-up for ${editor.realtorName}. Times use ${timeZone}.`
              : "Update showing schedule."}
          </SheetDescription>
        </SheetHeader>

        {editor ? (
          <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                checked={editor.emailEnabled}
                label="Email"
                onChange={(checked) => patch({ emailEnabled: checked })}
              />
              <Toggle
                checked={editor.smsEnabled}
                label="SMS"
                onChange={(checked) => patch({ smsEnabled: checked })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First message date">
                <Input
                  onChange={(event) => updateDateTime(event.target.value, time)}
                  type="date"
                  value={date}
                />
              </Field>
              <Field label="First message time">
                <Input
                  onChange={(event) => updateDateTime(date, event.target.value)}
                  type="time"
                  value={time}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              {"Leave both empty to send immediately."}
            </p>

            <Field label="Direct template">
              <Select
                onValueChange={(value) =>
                  patch({ directTemplateId: value === "none" ? "" : value })
                }
                value={editor.directTemplateId || "none"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{"Default reminder"}</SelectItem>
                  {directTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Toggle
              checked={editor.followUpEnabled}
              label="Enable follow-up"
              onChange={(checked) => patch({ followUpEnabled: checked })}
            />

            {editor.followUpEnabled ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Follow-up template">
                  <Select
                    onValueChange={(value) =>
                      patch({
                        followUpTemplateId: value === "none" ? "" : value,
                      })
                    }
                    value={editor.followUpTemplateId || "none"}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{"No follow-up"}</SelectItem>
                      {followUpTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Gap days">
                  <Input
                    min={1}
                    onChange={(event) =>
                      patch({
                        followUpGapDays: Math.max(
                          1,
                          Number(event.target.value) || 1,
                        ),
                      })
                    }
                    type="number"
                    value={editor.followUpGapDays}
                  />
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}

        <SheetFooter>
          <Button disabled={isSaving} onClick={onClose} type="button" variant="outline">
            {"Cancel"}
          </Button>
          <Button disabled={isSaving || !editor} onClick={onSave} type="button">
            {isSaving ? "Saving..." : "Save schedule"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm font-medium text-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  )
}
