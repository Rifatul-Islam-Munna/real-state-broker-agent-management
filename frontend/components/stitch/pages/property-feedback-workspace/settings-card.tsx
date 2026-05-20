"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { PropertyFeedbackAutomationSettings } from "@/hooks/use-real-estate-api"

const emptyValue = "__empty__"

export function FeedbackSettingsCard({
  isSaving,
  onChange,
  onSave,
  settings,
}: {
  isSaving: boolean
  onChange: (next: PropertyFeedbackAutomationSettings) => void
  onSave: () => void
  settings: PropertyFeedbackAutomationSettings
}) {
  function toggleChannel(key: "ownerReportChannels" | "feedbackRequestChannels", channel: "Email" | "SMS") {
    const current = settings[key]
    const next = current.includes(channel)
      ? current.filter((item) => item !== channel)
      : [...current, channel]

    onChange({ ...settings, [key]: next.length === 0 ? ["Email"] : next })
  }

  return (
    <section className="rounded-[1.8rem] border border-[#1b5e8a]/12 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#1b5e8a]/70">{"Automation Control"}</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{"Feedback + owner report settings"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {"Set when reminders fire, when owner reports go out, and which channels the system should use."}
          </p>
        </div>
        <button
          className="rounded-full border border-[#1b5e8a] bg-[#1b5e8a] px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          disabled={isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <article className="rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/80 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{"Feedback reminders"}</h3>
              <p className="mt-1 text-sm text-slate-500">{"Ask showing agent or broker for post-visit reasons."}</p>
            </div>
            <Switch
              checked={settings.feedbackRequestEnabled}
              onCheckedChange={(checked) => onChange({ ...settings, feedbackRequestEnabled: checked })}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Send after hours"}</span>
              <Input
                min={1}
                onChange={(event) => onChange({ ...settings, feedbackRequestDelayHours: Number(event.target.value) || 1 })}
                type="number"
                value={settings.feedbackRequestDelayHours}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Follow-up hours"}</span>
              <Input
                min={1}
                onChange={(event) => onChange({ ...settings, feedbackRequestFollowUpDelayHours: Number(event.target.value) || 1 })}
                type="number"
                value={settings.feedbackRequestFollowUpDelayHours}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Max follow-ups"}</span>
              <Input
                min={0}
                onChange={(event) => onChange({ ...settings, feedbackRequestMaxFollowUps: Number(event.target.value) || 0 })}
                type="number"
                value={settings.feedbackRequestMaxFollowUps}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["Email", "SMS"] as const).map((channel) => {
              const active = settings.feedbackRequestChannels.includes(channel)
              return (
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#1b5e8a] bg-[#1b5e8a] text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  key={channel}
                  onClick={() => toggleChannel("feedbackRequestChannels", channel)}
                  type="button"
                >
                  {channel}
                </button>
              )
            })}
          </div>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Reminder subject"}</span>
              <Input
                onChange={(event) => onChange({ ...settings, feedbackRequestSubject: event.target.value })}
                value={settings.feedbackRequestSubject}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Reminder text"}</span>
              <Textarea
                className="min-h-32"
                onChange={(event) => onChange({ ...settings, feedbackRequestBody: event.target.value })}
                value={settings.feedbackRequestBody}
              />
            </label>
          </div>
        </article>

        <article className="rounded-[1.4rem] border border-slate-200 bg-[#f7f5f1]/80 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">{"Owner reports"}</h3>
              <p className="mt-1 text-sm text-slate-500">{"Send weekly or monthly owner update from saved negative feedback."}</p>
            </div>
            <Switch
              checked={settings.ownerReportEnabled}
              onCheckedChange={(checked) => onChange({ ...settings, ownerReportEnabled: checked })}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Frequency"}</span>
              <Select
                onValueChange={(value) =>
                  onChange({
                    ...settings,
                    ownerReportFrequency: value === emptyValue ? "Weekly" : (value as PropertyFeedbackAutomationSettings["ownerReportFrequency"]),
                  })
                }
                value={settings.ownerReportFrequency || emptyValue}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">{"Weekly"}</SelectItem>
                  <SelectItem value="Monthly">{"Monthly"}</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Week day"}</span>
              <Input
                max={6}
                min={0}
                onChange={(event) => onChange({ ...settings, ownerReportDayOfWeek: Number(event.target.value) || 0 })}
                type="number"
                value={settings.ownerReportDayOfWeek}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Month day"}</span>
              <Input
                max={28}
                min={1}
                onChange={(event) => onChange({ ...settings, ownerReportDayOfMonth: Number(event.target.value) || 1 })}
                type="number"
                value={settings.ownerReportDayOfMonth}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"UTC hour"}</span>
              <Input
                max={23}
                min={0}
                onChange={(event) => onChange({ ...settings, ownerReportSendHourUtc: Number(event.target.value) || 0 })}
                type="number"
                value={settings.ownerReportSendHourUtc}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["Email", "SMS"] as const).map((channel) => {
              const active = settings.ownerReportChannels.includes(channel)
              return (
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-bold ${active ? "border-[#c18b2f] bg-[#c18b2f] text-white" : "border-slate-200 bg-white text-slate-600"}`}
                  key={channel}
                  onClick={() => toggleChannel("ownerReportChannels", channel)}
                  type="button"
                >
                  {channel}
                </button>
              )
            })}
          </div>
          <div className="mt-4 grid gap-4">
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Owner report subject"}</span>
              <Input
                onChange={(event) => onChange({ ...settings, ownerReportSubject: event.target.value })}
                value={settings.ownerReportSubject}
              />
            </label>
            <label className="space-y-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              <span>{"Owner report text"}</span>
              <Textarea
                className="min-h-32"
                onChange={(event) => onChange({ ...settings, ownerReportBody: event.target.value })}
                value={settings.ownerReportBody}
              />
            </label>
          </div>
        </article>
      </div>
    </section>
  )
}
