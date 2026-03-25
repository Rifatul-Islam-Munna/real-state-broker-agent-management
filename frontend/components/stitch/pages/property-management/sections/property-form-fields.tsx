import { useMemo, useState } from "react"

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
import type { AgentUserOption, PropertyItem } from "@/@types/real-estate-api"

import {
  defaultAmenityOptions,
  FieldError,
  type NeighborhoodInsightFormValue,
  type PropertyFormErrors,
  type PropertyFormValues,
} from "./property-form-shared"

const formSelectClassName =
  "h-11 w-full rounded-xl border-slate-200 bg-slate-50 px-4 text-sm dark:border-slate-700 dark:bg-slate-800"

const emptySelectValue = "__empty__"

type PropertyFormFieldsSectionProps = {
  agentOptions: AgentUserOption[]
  errors: PropertyFormErrors
  formValues: PropertyFormValues
  isAgentOptionsLoading?: boolean
  selectedAmenities: Set<string>
  updateField: <K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) => void
}

export function PropertyFormFieldsSection({
  agentOptions,
  errors,
  formValues,
  isAgentOptionsLoading = false,
  selectedAmenities,
  updateField,
}: PropertyFormFieldsSectionProps) {
  const [newAmenity, setNewAmenity] = useState("")
  const neighborhoodInsights = formValues.neighborhoodInsights ?? []
  const selectedAgentLabel = formValues.agentId
    ? agentOptions.find((agent) => agent.id === formValues.agentId)?.fullName ?? `Agent #${formValues.agentId}`
    : isAgentOptionsLoading
      ? "Loading agents..."
      : "Assign later"
  const propertyTypeLabel = formValues.propertyType === "Commercial" ? "Commercial" : "Residential"
  const listingTypeLabel = formValues.listingType === "ForRent" ? "For Rent" : "For Sale"
  const listingStatusLabel = formValues.status === "Closed" ? "Closed" : "Open"
  const amenityOptions = useMemo(() => {
    const mergedAmenities = new Set(
      [...defaultAmenityOptions, ...(formValues.keyAmenities ?? [])]
        .map((item) => item.trim())
        .filter(Boolean),
    )

    return Array.from(mergedAmenities)
  }, [formValues.keyAmenities])

  function toggleAmenity(amenity: string, checked: boolean) {
    const currentAmenities = formValues.keyAmenities ?? []

    if (checked) {
      const alreadyExists = currentAmenities.some((item) => item.toLowerCase() === amenity.toLowerCase())

      if (!alreadyExists) {
        updateField("keyAmenities", [...currentAmenities, amenity])
      }

      return
    }

    updateField(
      "keyAmenities",
      currentAmenities.filter((item) => item.toLowerCase() !== amenity.toLowerCase()),
    )
  }

  function addAmenity() {
    const nextAmenity = newAmenity.trim()

    if (!nextAmenity) {
      return
    }

    const alreadyExists = (formValues.keyAmenities ?? []).some(
      (item) => item.toLowerCase() === nextAmenity.toLowerCase(),
    )

    if (!alreadyExists) {
      updateField("keyAmenities", [...(formValues.keyAmenities ?? []), nextAmenity])
    }

    setNewAmenity("")
  }

  function updateNeighborhoodInsight(index: number, value: Partial<NeighborhoodInsightFormValue>) {
    const nextInsights = neighborhoodInsights.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...value } : item,
    )
    updateField("neighborhoodInsights", nextInsights)
  }

  function addNeighborhoodInsight() {
    updateField("neighborhoodInsights", [...neighborhoodInsights, { type: "", description: "" }])
  }

  function removeNeighborhoodInsight(index: number) {
    const nextInsights = neighborhoodInsights.filter((_, itemIndex) => itemIndex !== index)
    updateField(
      "neighborhoodInsights",
      nextInsights.length > 0 ? nextInsights : [{ type: "", description: "" }],
    )
  }

  return (
    <>
      <section>
        <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AppIcon className="text-primary" name="info" />
          {" Basic Information "}
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Listing Title"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g. Grand Penthouse Downtown"
              type="text"
              value={formValues.title}
            />
            <FieldError error={errors.title} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Assigned Agent"}
            </label>
            <Select
              modal={false}
              onValueChange={(value) => updateField("agentId", value === emptySelectValue ? null : Number(value))}
              value={formValues.agentId ? `${formValues.agentId}` : emptySelectValue}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {selectedAgentLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={emptySelectValue}>
                  {isAgentOptionsLoading ? "Loading agents..." : "Assign later"}
                </SelectItem>
                {agentOptions.map((agent) => (
                  <SelectItem key={agent.id} value={`${agent.id}`}>
                    {agent.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={errors.agentId} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Property Type"}
            </label>
            <Select
              modal={false}
              onValueChange={(value) => updateField("propertyType", value as PropertyItem["propertyType"])}
              value={formValues.propertyType}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {propertyTypeLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Residential">{"Residential"}</SelectItem>
                <SelectItem value="Commercial">{"Commercial"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Listing Type"}
            </label>
            <Select
              modal={false}
              onValueChange={(value) => updateField("listingType", value as PropertyItem["listingType"])}
              value={formValues.listingType}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {listingTypeLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ForSale">{"For Sale"}</SelectItem>
                <SelectItem value="ForRent">{"For Rent"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Listing Price"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="e.g. $850,000 or $4,200/mo"
              type="text"
              value={formValues.price}
            />
            <FieldError error={errors.price} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Listing Status"}
            </label>
            <Select
              modal={false}
              onValueChange={(value) => updateField("status", value as PropertyItem["status"])}
              value={formValues.status}
            >
              <SelectTrigger className={formSelectClassName}>
                <SelectValue>
                  {listingStatusLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">{"Open"}</SelectItem>
                <SelectItem value="Closed">{"Closed"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Market / City"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="e.g. Miami, FL"
              type="text"
              value={formValues.location}
            />
            <FieldError error={errors.location} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Street Address"}
            </label>
            <div className="relative">
              <AppIcon className="absolute left-4 top-2.5 text-slate-400" name="location_on" />
              <Input
                className="form-input w-full rounded-xl border-slate-200 bg-slate-50 pl-12 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
                onChange={(event) => updateField("exactLocation", event.target.value)}
                placeholder="Street, area, and city details"
                type="text"
                value={formValues.exactLocation}
              />
            </div>
            <FieldError error={errors.exactLocation} />
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AppIcon className="text-primary" name="straighten" />
          {" Specifications & Layout "}
        </h4>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Bedrooms"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("bedRoom", event.target.value)}
              placeholder="e.g. 4"
              type="text"
              value={formValues.bedRoom}
            />
            <FieldError error={errors.bedRoom} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Bathrooms"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("bathRoom", event.target.value)}
              placeholder="e.g. 3.5"
              type="text"
              value={formValues.bathRoom}
            />
            <FieldError error={errors.bathRoom} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {"Sq Ft / Size"}
            </label>
            <Input
              className="form-input rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
              onChange={(event) => updateField("width", event.target.value)}
              placeholder="e.g. 3,200 sq ft"
              type="text"
              value={formValues.width}
            />
            <FieldError error={errors.width} />
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AppIcon className="text-primary" name="description" />
          {" Property Description "}
        </h4>
        <Textarea
          className="form-textarea min-h-36 w-full rounded-xl border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Write a compelling description of the property..."
          value={formValues.description}
        />
        <FieldError error={errors.description} />
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AppIcon className="text-primary" name="checklist" />
          {" Amenities "}
        </h4>
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 md:flex-row md:items-center dark:border-slate-700 dark:bg-slate-800/50">
          <Input
            className="form-input rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 focus:ring-primary"
            onChange={(event) => setNewAmenity(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                addAmenity()
              }
            }}
            placeholder="Add a custom amenity"
            type="text"
            value={newAmenity}
          />
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90"
            onClick={addAmenity}
            type="button"
          >
            <AppIcon className="text-base" name="add" />
            {"Add Amenity"}
          </button>
        </div>
        {(formValues.keyAmenities ?? []).length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-3">
            {(formValues.keyAmenities ?? []).map((amenity) => (
              <button
                key={`selected-${amenity}`}
                className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary/10"
                onClick={() => toggleAmenity(amenity, false)}
                type="button"
              >
                <span>{amenity}</span>
                <AppIcon className="text-sm" name="close" />
              </button>
            ))}
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {amenityOptions.map((amenity) => (
            <label key={amenity} className="group flex cursor-pointer items-center gap-3">
              <input
                checked={selectedAmenities.has(amenity)}
                className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                onChange={(event) => toggleAmenity(amenity, event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm text-slate-600 transition-colors group-hover:text-primary dark:text-slate-400">
                {amenity}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <AppIcon className="text-primary" name="location_city" />
          {" Neighborhood Insights "}
        </h4>
        <div className="space-y-4">
          {neighborhoodInsights.map((insight, index) => (
            <div key={`neighborhood-insight-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{`Insight ${index + 1}`}</p>
                <button
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-600"
                  onClick={() => removeNeighborhoodInsight(index)}
                  type="button"
                >
                  <AppIcon className="text-base" name="delete" />
                  {"Remove"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Insight Type"}
                  </label>
                  <Input
                    className="form-input rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 focus:ring-primary"
                    list={`neighborhood-insight-types-${index}`}
                    onChange={(event) => updateNeighborhoodInsight(index, { type: event.target.value })}
                    placeholder="e.g. Walkability"
                    type="text"
                    value={insight.type}
                  />
                  <datalist id={`neighborhood-insight-types-${index}`}>
                    <option value="Walkability" />
                    <option value="Schools" />
                    <option value="Transit" />
                    <option value="Dining" />
                    <option value="Shopping" />
                    <option value="Parks" />
                    <option value="Waterfront" />
                    <option value="Security" />
                  </datalist>
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {"Insight Description"}
                  </label>
                  <Textarea
                    className="form-textarea min-h-24 rounded-xl border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary"
                    onChange={(event) => updateNeighborhoodInsight(index, { description: event.target.value })}
                    placeholder="Describe why this neighborhood detail matters for the property."
                    value={insight.description}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4">
            <FieldError error={errors.neighborhoodInsights} />
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
              onClick={addNeighborhoodInsight}
              type="button"
            >
              <AppIcon className="text-base" name="add" />
              {"Add Insight"}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
