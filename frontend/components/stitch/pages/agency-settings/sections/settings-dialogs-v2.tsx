"use client"

import type { AgencyProfileSettings } from "@/@types/real-estate-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export const phoneCountryOptions = [
  ["US", "United States (+1)"],
  ["CA", "Canada (+1)"],
  ["GB", "United Kingdom (+44)"],
  ["BD", "Bangladesh (+880)"],
  ["IN", "India (+91)"],
  ["PK", "Pakistan (+92)"],
  ["AE", "United Arab Emirates (+971)"],
  ["SA", "Saudi Arabia (+966)"],
  ["AU", "Australia (+61)"],
] as const

const timeZoneOptions = [
  ["UTC", "UTC"],
  ["Asia/Dhaka", "Bangladesh — Asia/Dhaka"],
  ["Asia/Kolkata", "India — Asia/Kolkata"],
  ["Asia/Dubai", "UAE — Asia/Dubai"],
  ["Asia/Riyadh", "Saudi Arabia — Asia/Riyadh"],
  ["Europe/London", "United Kingdom — Europe/London"],
  ["Europe/Berlin", "Central Europe — Europe/Berlin"],
  ["America/New_York", "Miami / New York / Maine / US Eastern — America/New_York"],
  ["America/Detroit", "Detroit / Michigan — America/Detroit"],
  ["America/Indiana/Indianapolis", "Indianapolis / Indiana — America/Indiana/Indianapolis"],
  ["America/Chicago", "Chicago / Dallas / Oklahoma / US Central — America/Chicago"],
  ["America/Denver", "Denver / US Mountain — America/Denver"],
  ["America/Boise", "Boise / Idaho — America/Boise"],
  ["America/Phoenix", "Phoenix / Arizona — America/Phoenix"],
  ["America/Los_Angeles", "Los Angeles / Seattle / US Pacific — America/Los_Angeles"],
  ["America/Anchorage", "Alaska — America/Anchorage"],
  ["Pacific/Honolulu", "Hawaii — Pacific/Honolulu"],
  ["Australia/Sydney", "Australia — Australia/Sydney"],
] as const

export function ProfileSettingsDialog({
  onChange,
  onOpenChange,
  open,
  profile,
}: {
  onChange: (profile: AgencyProfileSettings) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  profile: AgencyProfileSettings
}) {
  function patch(update: Partial<AgencyProfileSettings>) {
    onChange({ ...profile, ...update })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{"Agency profile"}</DialogTitle>
          <DialogDescription>
            {"These details appear across the workspace, public contact areas, and outgoing communication."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field className="sm:col-span-2" label="Agency name">
            <Input onChange={(event) => patch({ agencyName: event.target.value })} value={profile.agencyName} />
          </Field>
          <Field label="Contact email">
            <Input onChange={(event) => patch({ contactEmail: event.target.value })} type="email" value={profile.contactEmail} />
          </Field>
          <Field label="Contact phone">
            <Input onChange={(event) => patch({ contactPhone: event.target.value })} value={profile.contactPhone} />
          </Field>
          <Field label="Default phone country">
            <Select onValueChange={(value) => patch({ defaultPhoneCountry: value })} value={profile.defaultPhoneCountry || "US"}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {phoneCountryOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Standard commission (%)">
            <Input onChange={(event) => patch({ standardCommissionPercent: event.target.value })} type="number" value={profile.standardCommissionPercent} />
          </Field>
          <Field label="Tax ID">
            <Input onChange={(event) => patch({ taxId: event.target.value })} value={profile.taxId} />
          </Field>
          <Field className="sm:col-span-2" label="Office locations">
            <Textarea
              className="min-h-28"
              onChange={(event) => patch({ officeLocations: event.target.value.split("\n") })}
              placeholder="One office per line"
              value={profile.officeLocations.join("\n")}
            />
          </Field>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} type="button">{"Apply to settings"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SchedulingSettingsDialog({
  isSaving,
  morningHour,
  onMorningHourChange,
  onOpenChange,
  onSave,
  onTimeZoneChange,
  open,
  timeZone,
}: {
  isSaving: boolean
  morningHour: number
  onMorningHourChange: (hour: number) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onTimeZoneChange: (timeZone: string) => void
  open: boolean
  timeZone: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{"Scheduling timezone"}</DialogTitle>
          <DialogDescription>
            {"Showing times and outreach schedules are interpreted in this timezone, then stored as UTC. Scheduled messages are checked every minute."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Agency timezone">
            <Select onValueChange={onTimeZoneChange} value={timeZone}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {timeZoneOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Morning automation hour">
            <Select onValueChange={(value) => onMorningHourChange(Number(value))} value={String(morningHour)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, hour) => (
                  <SelectItem key={hour} value={String(hour)}>
                    {`${String(hour).padStart(2, "0")}:00`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Alert>
            <AlertDescription>
              {`Daily automation runs at ${String(morningHour).padStart(2, "0")}:00 in ${timeZone}. Due messages are processed every minute.`}
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button disabled={isSaving} onClick={onSave} type="button">
            {isSaving ? "Saving..." : "Save scheduling"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode
  className?: string
  label: string
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
