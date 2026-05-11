"use client"

import { useMemo, useState } from "react"
import { sileo } from "sileo"

import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  useCreateShowingBooking,
  useProperties,
  useShowingAvailability,
} from "@/hooks/use-real-estate-api"
import { formatDateTimeLabel, propertyHeroImage } from "@/lib/admin-portal"

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function Section1Section() {
  const [selectedPropertyId, setSelectedPropertyId] = useState("")
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date(Date.now() + 86_400_000)))
  const [selectedSlot, setSelectedSlot] = useState("")
  const [formState, setFormState] = useState({
    contactEmail: "",
    contactName: "",
    contactPhone: "",
    notes: "",
  })

  const propertiesQuery = useProperties({ page: 1, pageSize: 100 })
  const availabilityQuery = useShowingAvailability({
    date: selectedDate,
    propertyId: selectedPropertyId,
  })
  const createShowingBooking = useCreateShowingBooking()

  const properties = propertiesQuery.data?.items ?? []
  const selectedProperty = useMemo(
    () => properties.find((property) => `${property.id}` === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  )
  const availableSlots = availabilityQuery.data ?? []

  async function handleSubmit() {
    if (!selectedPropertyId) {
      sileo.error({ title: "Choose property" })
      return
    }

    if (!selectedSlot) {
      sileo.error({ title: "Choose time slot" })
      return
    }

    if (!formState.contactName.trim()) {
      sileo.error({ title: "Name required" })
      return
    }

    if (!formState.contactEmail.trim() && !formState.contactPhone.trim()) {
      sileo.error({ title: "Email or phone required" })
      return
    }

    const slot = availableSlots.find((item) => item.startAt === selectedSlot)
    const response = await createShowingBooking.mutateAsync({
      contactEmail: formState.contactEmail.trim(),
      contactName: formState.contactName.trim(),
      contactPhone: formState.contactPhone.trim(),
      endAt: slot?.endAt ?? null,
      notes: formState.notes.trim(),
      propertyId: Number(selectedPropertyId),
      startAt: selectedSlot,
    })

    if (response.error) {
      return
    }

    setFormState({ contactEmail: "", contactName: "", contactPhone: "", notes: "" })
    setSelectedSlot("")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light p-4 md:p-8 dark:bg-background-dark">
      <div className="grid w-full max-w-6xl border border-primary/10 bg-white dark:bg-slate-900 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-primary/10 p-6 md:p-10 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-2 text-primary">
            <AppIcon className="text-3xl" name="calendar_month" />
            <h1 className="text-2xl font-bold tracking-tight">{"Schedule a Viewing"}</h1>
          </div>

          <div className="space-y-6">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Property"}
              <Select
                modal={false}
                onValueChange={(value) => {
                  setSelectedPropertyId(value)
                  setSelectedSlot("")
                }}
                value={selectedPropertyId}
              >
                <SelectTrigger className="h-auto border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800">
                  <SelectValue placeholder={propertiesQuery.isLoading ? "Loading properties..." : "Choose property"} />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={`${property.id}`}>
                      {property.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            {selectedProperty ? (
              <div className="flex gap-4 border border-primary/10 bg-background-light p-4 dark:bg-background-dark">
                <div
                  className="size-24 shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url("${propertyHeroImage(selectedProperty)}")` }}
                />
                <div>
                  <h2 className="text-lg font-bold text-primary">{selectedProperty.title}</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedProperty.exactLocation || selectedProperty.location}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{selectedProperty.agent?.fullName ?? "Auto assignment"}</p>
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Date"}
              <Input
                className="h-auto border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800"
                min={toDateInputValue(new Date())}
                onChange={(event) => {
                  setSelectedDate(event.target.value)
                  setSelectedSlot("")
                }}
                type="date"
                value={selectedDate}
              />
            </label>

            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-300">{"Available Slots"}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availabilityQuery.isLoading ? (
                  <p className="col-span-full text-sm font-semibold text-slate-500">{"Loading slots..."}</p>
                ) : availableSlots.length === 0 ? (
                  <p className="col-span-full text-sm font-semibold text-slate-500">{"Choose a property and date."}</p>
                ) : (
                  availableSlots.map((slot) => (
                    <button
                      key={slot.startAt}
                      className={slot.startAt === selectedSlot
                        ? "border border-primary bg-primary px-3 py-3 text-sm font-bold text-white"
                        : "border border-primary/10 px-3 py-3 text-sm font-bold text-primary disabled:cursor-not-allowed disabled:opacity-40"}
                      disabled={!slot.isAvailable}
                      onClick={() => setSelectedSlot(slot.startAt)}
                      type="button"
                    >
                      {formatDateTimeLabel(slot.startAt).split(",").slice(-1)[0]?.trim() ?? slot.startAt}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10">
          <h3 className="mb-6 text-xl font-bold text-slate-800 dark:text-slate-100">{"Your Information"}</h3>
          <div className="space-y-5">
            <Input
              className="h-auto border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800"
              onChange={(event) => setFormState((current) => ({ ...current, contactName: event.target.value }))}
              placeholder="Full name"
              value={formState.contactName}
            />
            <Input
              className="h-auto border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800"
              onChange={(event) => setFormState((current) => ({ ...current, contactEmail: event.target.value }))}
              placeholder="Email address"
              type="email"
              value={formState.contactEmail}
            />
            <Input
              className="h-auto border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800"
              onChange={(event) => setFormState((current) => ({ ...current, contactPhone: event.target.value }))}
              placeholder="Phone number"
              value={formState.contactPhone}
            />
            <Textarea
              className="min-h-28 border-primary/10 bg-slate-50 px-4 py-3 dark:bg-slate-800"
              onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Message for the agent"
              value={formState.notes}
            />
            <button
              className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              disabled={createShowingBooking.isPending}
              onClick={() => void handleSubmit()}
              type="button"
            >
              <span>{createShowingBooking.isPending ? "Booking..." : "Confirm Schedule"}</span>
              <AppIcon name="arrow_forward" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
