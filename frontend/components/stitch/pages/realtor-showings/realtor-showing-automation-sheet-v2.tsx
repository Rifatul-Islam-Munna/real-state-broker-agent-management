"use client"

import type { ReactNode } from "react"

import type { RealtorShowingAutomationInput } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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

export function RealtorShowingAutomationSheetV2({
  directTemplates,
  editor,
  followUpTemplates,
  isSaving,
  onChange,
  onClose,
  onSave,
  timeZone,
}: Props) {
  function patch(update: Partial<ShowingAutomationEditor>) {
    onChange(editor ? { ...editor, ...update } : null)
  }

  const date = editor?.outreachAt?.slice(0, 10) ?? ""
  const time = editor?.outreachAt?.slice(11, 16) ?? ""
  const directTemplateLabel = editor?.directTemplateId
    ? directTemplates.find((template) => template.id === editor.directTemplateId)?.name ?? "Default reminder"
    : "Default reminder"
  const followUpTemplateLabel = editor?.followUpTemplateId
    ? followUpTemplates.find((template) => template.id === editor.followUpTemplateId)?.name ?? "No follow-up"
    : "No follow-up"

  function updateDateTime(nextDate: string, nextTime: string) {
    patch({ outreachAt: nextDate && nextTime ? `${nextDate}T${nextTime}` : "" })
  }

  return (
    <Sheet open={editor !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="!w-full overflow-hidden border-0 bg-[var(--ether-surface)] p-0 shadow-[-20px_0_60px_rgba(11,28,48,0.16)] sm:!max-w-none lg:!w-[42vw] lg:!max-w-[42vw]">
        <SheetHeader className="border-b border-[var(--ether-outline-variant)] bg-white px-6 py-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-2xl font-bold tracking-[-0.02em] text-[var(--ether-on-surface)]">Showing Automation</SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-6 text-[var(--ether-on-surface-variant)]">
                {editor
                  ? `Update delivery channels, schedule, and follow-up for ${editor.realtorName}. Times use ${timeZone}.`
                  : "Update showing schedule."}
              </SheetDescription>
            </div>
            <button className="flex size-9 items-center justify-center rounded-full text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-high)]" onClick={onClose} type="button">
              <AppIcon name="close" />
            </button>
          </div>
        </SheetHeader>

        {editor ? (
          <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
            <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
              <div className="flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Delivery Channels</h3></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Toggle checked={editor.emailEnabled} icon="mail" label="Email" onChange={(checked) => patch({ emailEnabled: checked })} />
                <Toggle checked={editor.smsEnabled} icon="chat" label="SMS" onChange={(checked) => patch({ smsEnabled: checked })} />
              </div>
            </section>

            <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
              <div className="flex items-center gap-2"><span className="h-5 w-1 rounded-full bg-[var(--ether-primary)]" /><h3 className="ether-label-caps text-[var(--ether-on-surface-variant)]">Initial Outreach</h3></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="First message date"><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateDateTime(event.target.value, time)} type="date" value={date} /></Field>
                <Field label="First message time"><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" onChange={(event) => updateDateTime(date, event.target.value)} type="time" value={time} /></Field>
              </div>
              <p className="mt-3 text-xs text-[var(--ether-outline)]">Leave both fields empty to send immediately.</p>
              <div className="mt-5">
                <Field label="Direct template">
                  <Select onValueChange={(value) => patch({ directTemplateId: value === "none" ? "" : value })} value={editor.directTemplateId || "none"}>
                    <SelectTrigger className="h-11 w-full rounded-lg border-[var(--ether-outline-variant)]"><span className="truncate">{directTemplateLabel}</span></SelectTrigger>
                    <SelectContent><SelectItem value="none">Default reminder</SelectItem>{directTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)]">
              <Toggle checked={editor.followUpEnabled} icon="autorenew" label="Enable follow-up" onChange={(checked) => patch({ followUpEnabled: checked })} />
              {editor.followUpEnabled ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Follow-up template">
                    <Select onValueChange={(value) => patch({ followUpTemplateId: value === "none" ? "" : value })} value={editor.followUpTemplateId || "none"}>
                      <SelectTrigger className="h-11 w-full rounded-lg border-[var(--ether-outline-variant)]"><span className="truncate">{followUpTemplateLabel}</span></SelectTrigger>
                      <SelectContent><SelectItem value="none">No follow-up</SelectItem>{followUpTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Gap days"><Input className="h-11 rounded-lg border-[var(--ether-outline-variant)]" min={1} onChange={(event) => patch({ followUpGapDays: Math.max(1, Number(event.target.value) || 1) })} type="number" value={editor.followUpGapDays} /></Field>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        <SheetFooter className="border-t border-[var(--ether-outline-variant)] bg-white px-6 py-4">
          <Button className="h-11 rounded-lg px-5" disabled={isSaving} onClick={onClose} type="button" variant="outline">Cancel</Button>
          <Button className="h-11 rounded-lg bg-[var(--ether-primary)] px-6 font-semibold text-white" disabled={isSaving || !editor} onClick={onSave} type="button">{isSaving ? "Saving..." : "Save schedule"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <div className="space-y-2"><Label className="text-xs font-semibold text-[var(--ether-on-surface-variant)]">{label}</Label>{children}</div>
}

function Toggle({ checked, icon, label, onChange }: { checked: boolean; icon: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--ether-outline-variant)]/55 bg-[var(--ether-surface-container-low)]/45 p-4 text-sm font-semibold text-[var(--ether-on-surface)]">
      <span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"><AppIcon name={icon} /></span>{label}</span>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </label>
  )
}
