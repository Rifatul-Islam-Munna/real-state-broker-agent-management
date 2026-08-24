import { type ChangeEvent, useMemo, useState } from "react"

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
import { uploadPropertyAsset } from "@/lib/upload-client"

import {
  defaultAmenityOptions,
  FieldError,
  type NeighborhoodInsightFormValue,
  type PropertyFormErrors,
  type PropertyFormValues,
  type PropertyPreQuestionFormValue,
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
  const [uploadingQuestionIndex, setUploadingQuestionIndex] = useState<number | null>(null)
  const neighborhoodInsights = formValues.neighborhoodInsights ?? []
  const preQuestions = formValues.preQuestions ?? []
  const selectedAgentLabel = formValues.agentId
    ? agentOptions.find((agent) => agent.id === formValues.agentId)?.fullName ?? `Agent #${formValues.agentId}`
    : isAgentOptionsLoading
      ? "Loading agents..."
      : "Assign later"
  const propertyTypeLabel = formValues.propertyType === "Commercial" ? "Commercial" : "Residential"
  const listingTypeLabel = formValues.listingType === "ForRent" ? "For Rent" : "For Sale"
  const listingStatusLabel = `${formValues.status ?? "Draft"}`.replace(/([A-Z])/g, " $1").trim()
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

  function updatePreQuestion(index: number, value: Partial<PropertyPreQuestionFormValue>) {
    const nextQuestions = preQuestions.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...value } : item,
    )
    updateField("preQuestions", nextQuestions)
  }

  function addPreQuestion() {
    updateField("preQuestions", [
      ...preQuestions,
      {
        allowsFileUpload: false,
        attachmentObjectName: "",
        attachmentUrl: "",
        helperText: "",
        isRequired: true,
        prompt: "",
      },
    ])
  }

  async function handlePreQuestionAttachment(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) {
      return
    }

    setUploadingQuestionIndex(index)

    try {
      const upload = await uploadPropertyAsset(file, "properties/pre-questions")
      updatePreQuestion(index, {
        attachmentObjectName: upload.objectName,
        attachmentUrl: upload.url,
      })
    } finally {
      setUploadingQuestionIndex(null)
    }
  }

  function removePreQuestionAttachment(index: number) {
    updatePreQuestion(index, {
      attachmentObjectName: "",
      attachmentUrl: "",
    })
  }

  function removePreQuestion(index: number) {
    updateField("preQuestions", preQuestions.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <>
      <section>
        <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">
          <AppIcon className="text-[var(--ether-secondary)]" name="description" />
          {" Core Details "}
        </h4>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Listing Title"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="e.g. Grand Penthouse Downtown"
              type="text"
              value={formValues.title}
            />
            <FieldError error={errors.title} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Listing Price"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
              onChange={(event) => updateField("price", event.target.value)}
              placeholder="e.g. $850,000 or $4,200/mo"
              type="text"
              value={formValues.price}
            />
            <FieldError error={errors.price} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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
                <SelectItem value="Draft">{"Draft"}</SelectItem>
                <SelectItem value="PendingApproval">{"Pending Approval"}</SelectItem>
                <SelectItem value="Active">{"Active"}</SelectItem>
                <SelectItem value="Inactive">{"Inactive — no public leads"}</SelectItem>
                <SelectItem value="UnderOffer">{"Under Offer"}</SelectItem>
                <SelectItem value="Sold">{"Sold"}</SelectItem>
                <SelectItem value="Rented">{"Rented"}</SelectItem>
                <SelectItem value="Unpublished">{"Unpublished"}</SelectItem>
                <SelectItem value="Open">{"Open (legacy)"}</SelectItem>
                <SelectItem value="Closed">{"Closed (legacy)"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Market / City"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="e.g. Miami, FL"
              type="text"
              value={formValues.location}
            />
            <FieldError error={errors.location} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Street Address"}
            </label>
            <div className="relative">
              <AppIcon className="absolute left-4 top-2.5 text-slate-400" name="location_on" />
              <Input
                className="h-12 w-full rounded-lg border-0 bg-[var(--ether-surface-container-low)] pl-12 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
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

      <section className="rounded-[24px] border bg-white p-5 shadow-[var(--shadow-surface-1)] sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"><AppIcon name="verified_user" /></span>
          <div><h4 className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">Applicant Requirements & Showing</h4><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Optional qualification rules plus private realtor access instructions.</p></div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Minimum Credit Score</label><Input min="300" max="850" type="number" value={formValues.minimumCreditScore} onChange={(event) => updateField("minimumCreditScore", event.target.value)} placeholder="e.g. 680" /><FieldError error={errors.minimumCreditScore} /></div>
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Minimum Monthly Income</label><Input min="0" step="0.01" type="number" value={formValues.minimumMonthlyIncome} onChange={(event) => updateField("minimumMonthlyIncome", event.target.value)} placeholder="e.g. 7500" /><FieldError error={errors.minimumMonthlyIncome} /></div>
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Security Deposit</label><Input min="0" step="0.01" type="number" value={formValues.securityDeposit} onChange={(event) => updateField("securityDeposit", event.target.value)} placeholder="e.g. 2500" /><FieldError error={errors.securityDeposit} /></div>
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Application Fee</label><Input min="0" step="0.01" type="number" value={formValues.applicationFee} onChange={(event) => updateField("applicationFee", event.target.value)} placeholder="e.g. 50" /><FieldError error={errors.applicationFee} /></div>
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Available From</label><Input type="date" value={formValues.availableFrom} onChange={(event) => updateField("availableFrom", event.target.value)} /></div>
          <div className="flex flex-col gap-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Minimum Lease (Months)</label><Input min="1" type="number" value={formValues.minimumLeaseMonths} onChange={(event) => updateField("minimumLeaseMonths", event.target.value)} placeholder="e.g. 12" /><FieldError error={errors.minimumLeaseMonths} /></div>
          <div className="flex flex-col gap-2 md:col-span-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Application Instructions</label><Textarea className="min-h-24" value={formValues.applicationInstructions} onChange={(event) => updateField("applicationInstructions", event.target.value)} placeholder="Documents required, income proof, screening steps..." /></div>
          <div className="flex flex-col gap-2 md:col-span-2"><label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Realtor Property Showing Instructions</label><Textarea className="min-h-28" value={formValues.realtorShowingInstructions} onChange={(event) => updateField("realtorShowingInstructions", event.target.value)} placeholder="Private: notice required, lockbox/access steps, parking, alarm, showing restrictions..." /><p className="text-xs text-[var(--ether-outline)]">Private management information; it is not returned by the public property API.</p></div>
        </div>
      </section>

      <section className="rounded-[24px] bg-[var(--ether-surface-container-low)] p-5 sm:p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] pb-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--ether-primary)] shadow-sm">
            <AppIcon name="person_pin" />
          </span>
          <div>
            <h4 className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">Property Owner</h4>
            <p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Primary owner contact and internal handling notes.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Owner Name</label>
            <Input className="h-12 rounded-lg border-0 bg-white px-4 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("ownerName", event.target.value)} placeholder="Property owner full name" value={formValues.ownerName} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Owner Phone</label>
            <div className="relative">
              <AppIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="call" />
              <Input className="h-12 rounded-lg border-0 bg-white pl-11 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("ownerPhone", event.target.value)} placeholder="+1 555 000 0000" type="tel" value={formValues.ownerPhone} />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Owner Email</label>
            <div className="relative">
              <AppIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ether-outline)]" name="mail" />
              <Input className="h-12 rounded-lg border-0 bg-white pl-11 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("ownerEmail", event.target.value)} placeholder="owner@example.com" type="email" value={formValues.ownerEmail} />
            </div>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">Internal Operations Note</label>
            <Textarea className="min-h-28 rounded-lg border-0 bg-white p-4 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => updateField("ownerExtraInfo", event.target.value)} placeholder="Preferred contact time, ownership notes, access instructions..." value={formValues.ownerExtraInfo} />
          </div>
        </div>
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">
          <AppIcon className="text-[var(--ether-secondary)]" name="straighten" />
          {" Specifications & Layout "}
        </h4>
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Bedrooms"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
              onChange={(event) => updateField("bedRoom", event.target.value)}
              placeholder="e.g. 4"
              type="text"
              value={formValues.bedRoom}
            />
            <FieldError error={errors.bedRoom} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Bathrooms"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
              onChange={(event) => updateField("bathRoom", event.target.value)}
              placeholder="e.g. 3.5"
              type="text"
              value={formValues.bathRoom}
            />
            <FieldError error={errors.bathRoom} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
              {"Sq Ft / Size"}
            </label>
            <Input
              className="h-12 rounded-lg border-0 bg-[var(--ether-surface-container-low)] px-4 text-[var(--ether-on-surface)] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20"
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
        <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">
          <AppIcon className="text-[var(--ether-secondary)]" name="description" />
          {" Property Description "}
        </h4>
        <Textarea
          className="form-textarea min-h-36 w-full rounded-xl border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 focus:ring-primary"
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Write a compelling description of the property..."
          value={formValues.description}
        />
        <FieldError error={errors.description} />
        <div className="mt-4 flex flex-col gap-2">
          <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
            {"Extra Property Description"}
          </label>
          <Textarea
            className="min-h-28"
            onChange={(event) => updateField("extraDescription", event.target.value)}
            placeholder="Internal or additional property details..."
            value={formValues.extraDescription}
          />
        </div>
      </section>

      <section className="rounded-[24px] bg-white p-5 shadow-[var(--shadow-surface-1)] sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-[color-mix(in_srgb,var(--ether-outline-variant)_35%,transparent)] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)]"><AppIcon name="checklist" /></span>
            <div><h4 className="text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">Amenities</h4><p className="mt-1 text-sm text-[var(--ether-on-surface-variant)]">Select features that should appear on the listing.</p></div>
          </div>
          <span className="rounded-full bg-[var(--ether-surface-container-low)] px-3 py-1 text-xs font-semibold text-[var(--ether-on-surface-variant)]">{selectedAmenities.size} selected</span>
        </div>
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-[var(--ether-surface-container-low)] p-4 md:flex-row md:items-center">
          <Input className="h-11 rounded-lg border-0 bg-white px-4 shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--ether-primary)]/20" onChange={(event) => setNewAmenity(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAmenity() } }} placeholder="Add a custom amenity" type="text" value={newAmenity} />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--ether-primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--ether-primary-container)]" onClick={addAmenity} type="button"><AppIcon className="text-base" name="add" />Add Amenity</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {amenityOptions.map((amenity) => {
            const checked = selectedAmenities.has(amenity)
            return (
              <label key={amenity} className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition ${checked ? "bg-[var(--ether-primary-fixed)] text-[var(--ether-primary)] shadow-sm" : "bg-[var(--ether-surface-container-low)] text-[var(--ether-on-surface-variant)] hover:bg-[var(--ether-surface-container-high)]"}`}>
                <input checked={checked} className="size-4 rounded border-[var(--ether-outline-variant)] text-[var(--ether-primary)] focus:ring-[var(--ether-primary)]" onChange={(event) => toggleAmenity(amenity, event.target.checked)} type="checkbox" />
                <span className="text-sm font-semibold">{amenity}</span>
              </label>
            )
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">
          <AppIcon className="text-[var(--ether-secondary)]" name="location_city" />
          {" Neighborhood Insights "}
        </h4>
        <div className="space-y-4">
          {neighborhoodInsights.map((insight, index) => (
            <div key={`neighborhood-insight-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="ether-label-caps text-[var(--ether-on-surface-variant)]">{`Insight ${index + 1}`}</p>
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
                  <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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
                  <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
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

      <section>
        <h4 className="mb-6 flex items-center gap-2 text-xl font-semibold text-[var(--ether-on-surface)] sm:text-2xl">
          <AppIcon className="text-[var(--ether-secondary)]" name="forum" />
          {" Pre-Questions For Chat "}
        </h4>
        <div className="space-y-4">
          {preQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
              {"No pre-questions added yet. Add one if the listing chat should collect details before the visitor shares contact information."}
            </div>
          ) : (
            preQuestions.map((question, index) => (
              <div key={`pre-question-${question.id ?? index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="ether-label-caps text-[var(--ether-on-surface-variant)]">{`Pre-question ${index + 1}`}</p>
                  <button
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-600"
                    onClick={() => removePreQuestion(index)}
                    type="button"
                  >
                    <AppIcon className="text-base" name="delete" />
                    {"Remove"}
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
                      {"Question Prompt"}
                    </label>
                    <Input
                      className="form-input rounded-xl border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 focus:ring-primary"
                      onChange={(event) => updatePreQuestion(index, { prompt: event.target.value })}
                      placeholder="e.g. What would you like to know before speaking to the agent?"
                      type="text"
                      value={question.prompt}
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="ether-label-caps text-[var(--ether-on-surface-variant)]">
                      {"Helper Text"}
                    </label>
                    <Textarea
                      className="form-textarea min-h-24 rounded-xl border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 focus:ring-primary"
                      onChange={(event) => updatePreQuestion(index, { helperText: event.target.value })}
                      placeholder="Optional instruction shown inside the chat prompt."
                      value={question.helperText}
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <input
                      checked={question.isRequired}
                      className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                      onChange={(event) => updatePreQuestion(index, { isRequired: event.target.checked })}
                      type="checkbox"
                    />
                    {"Required before continuing"}
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <input
                      checked={question.allowsFileUpload}
                      className="form-checkbox rounded border-slate-300 text-primary focus:ring-primary"
                      onChange={(event) => updatePreQuestion(index, { allowsFileUpload: event.target.checked })}
                      type="checkbox"
                    />
                    {"Allow visitor file upload"}
                  </label>
                  <div className="flex flex-col gap-3 md:col-span-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10">
                        <AppIcon className="text-base" name="attach_file" />
                        {uploadingQuestionIndex === index
                          ? "Uploading..."
                          : question.attachmentUrl
                            ? "Replace Reference File"
                            : "Upload Reference File"}
                        <input
                          className="hidden"
                          onChange={(event) => void handlePreQuestionAttachment(index, event)}
                          type="file"
                        />
                      </label>
                      {question.attachmentUrl ? (
                        <button
                          className="text-xs font-bold uppercase tracking-wide text-rose-600"
                          onClick={() => removePreQuestionAttachment(index)}
                          type="button"
                        >
                          {"Remove File"}
                        </button>
                      ) : null}
                    </div>
                    {question.attachmentUrl ? (
                      <a
                        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                        href={question.attachmentUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {"Open uploaded reference file"}
                      </a>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {"Optional file the chat can show before the visitor answers."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="flex items-center justify-between gap-4">
            <FieldError error={errors.preQuestions} />
            <button
              className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/10"
              onClick={addPreQuestion}
              type="button"
            >
              <AppIcon className="text-base" name="add" />
              {"Add Pre-Question"}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}


