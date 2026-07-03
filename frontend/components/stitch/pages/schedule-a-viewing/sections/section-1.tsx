"use client"

import { useMemo, useState } from "react"
import { sileo } from "sileo"

import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

export function Section1Section() {
  const [selectedPropertyId, setSelectedPropertyId] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
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

  const properties = useMemo(
    () => propertiesQuery.data?.items ?? [],
    [propertiesQuery.data?.items],
  )
  const selectedProperty = useMemo(
    () =>
      properties.find((property) => `${property.id}` === selectedPropertyId) ??
      null,
    [properties, selectedPropertyId],
  )
  const availableSlots = availabilityQuery.data ?? []

  async function handleSubmit() {
    if (!selectedPropertyId) {
      sileo.error({ title: "Choose property" })
      return
    }

    if (!selectedDate) {
      sileo.error({ title: "Choose date" })
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

    if (response.error) return

    setFormState({ contactEmail: "", contactName: "", contactPhone: "", notes: "" })
    setSelectedSlot("")
  }

  return (
    <div className="min-h-screen bg-muted/20 p-4 md:p-8">
      <Card className="mx-auto grid w-full max-w-6xl gap-0 overflow-hidden p-0 shadow-xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b p-6 md:p-10 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AppIcon className="text-2xl" name="calendar_month" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{"Schedule a viewing"}</h1>
              <p className="text-sm text-muted-foreground">
                {"Choose a property, date, and available appointment time."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <label className="flex flex-col gap-2 text-sm font-semibold">
              {"Property"}
              <Select
                modal={false}
                onValueChange={(value) => {
                  setSelectedPropertyId(value)
                  setSelectedSlot("")
                }}
                value={selectedPropertyId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      propertiesQuery.isLoading
                        ? "Loading properties..."
                        : "Choose property"
                    }
                  />
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
              <Card size="sm">
                <CardContent className="flex gap-4 pt-1">
                  <div
                    className="size-24 shrink-0 rounded-xl bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${propertyHeroImage(selectedProperty)}")`,
                    }}
                  />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {selectedProperty.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedProperty.exactLocation || selectedProperty.location}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {selectedProperty.agent?.fullName ?? "Auto assignment"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <label className="flex flex-col gap-2 text-sm font-semibold">
              {"Date"}
              <Input
                onChange={(event) => {
                  setSelectedDate(event.target.value)
                  setSelectedSlot("")
                }}
                type="date"
                value={selectedDate}
              />
            </label>

            <div>
              <h3 className="mb-3 text-sm font-semibold">{"Available slots"}</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {availabilityQuery.isLoading ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    {"Loading slots..."}
                  </p>
                ) : availableSlots.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    {"Choose a property and date."}
                  </p>
                ) : (
                  availableSlots.map((slot) => (
                    <Button
                      disabled={!slot.isAvailable}
                      key={slot.startAt}
                      onClick={() => setSelectedSlot(slot.startAt)}
                      size="sm"
                      type="button"
                      variant={slot.startAt === selectedSlot ? "default" : "outline"}
                    >
                      {formatDateTimeLabel(slot.startAt)
                        .split(",")
                        .slice(-1)[0]
                        ?.trim() ?? slot.startAt}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="rounded-none border-0 py-0 shadow-none">
          <CardHeader className="px-6 pt-6 md:px-10 md:pt-10">
            <CardTitle>{"Your information"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 px-6 pb-6 md:px-10 md:pb-10">
            <Input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
              placeholder="Full name"
              value={formState.contactName}
            />
            <Input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }))
              }
              placeholder="Email address"
              type="email"
              value={formState.contactEmail}
            />
            <Input
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  contactPhone: event.target.value,
                }))
              }
              placeholder="Phone number"
              value={formState.contactPhone}
            />
            <Textarea
              className="min-h-28"
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              placeholder="Message for the agent"
              value={formState.notes}
            />
            <Button
              className="w-full"
              disabled={createShowingBooking.isPending}
              onClick={() => void handleSubmit()}
              size="lg"
              type="button"
            >
              <span>
                {createShowingBooking.isPending ? "Booking..." : "Confirm schedule"}
              </span>
              <AppIcon name="arrow_forward" />
            </Button>
          </CardContent>
        </Card>
      </Card>
    </div>
  )
}
