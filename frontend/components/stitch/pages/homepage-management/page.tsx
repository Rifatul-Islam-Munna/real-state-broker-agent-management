"use client"

/* eslint-disable @next/next/no-img-element */

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"

import type { HomePageImageAsset, HomePageSettings } from "@/@types/real-estate-api"
import { useAdminHomePageSettings, useUpdateHomePageSettings } from "@/hooks/use-real-estate-api"
import { cloneHomePageSettings, defaultHomePageSettings } from "@/lib/home-page-settings"
import { deleteUploadedAsset, uploadPropertyAsset } from "@/lib/upload-client"
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ImageUploadFieldProps = {
  description: string
  label: string
  uploadPath: string
  value: HomePageImageAsset
  onChange: (value: HomePageImageAsset) => void
}

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "Not saved yet"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "Not saved yet"
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function collectImageObjectNames(settings: HomePageSettings) {
  return [
    settings.hero.backgroundImage.objectName,
    settings.whyChooseUs.primaryImage.objectName,
    settings.whyChooseUs.secondaryImage.objectName,
    settings.testimonial.avatarImage.objectName,
    ...settings.neighborhoods.cards.map((card) => card.image.objectName),
  ].filter((item): item is string => Boolean(item))
}

function SectionCard({
  title,
  description,
  children,
}: Readonly<{
  title: string
  description: string
  children: React.ReactNode
}>) {
  return (
    <section className="border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)] lg:p-8">
      <div className="border-b border-slate-100 pb-5">
        <p className="text-xs font-black uppercase tracking-[0.26em] text-secondary">
          {title}
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
          {description}
        </p>
      </div>
      <div className="mt-6 space-y-6">
        {children}
      </div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>
      <Input
        className="rounded-none border-slate-200 bg-slate-50"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
}>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-slate-700">
        {label}
      </span>
      <Textarea
        className="rounded-none border-slate-200 bg-slate-50 p-4"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  )
}

function ImageUploadField({
  description,
  label,
  uploadPath,
  value,
  onChange,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileSelection(file: File) {
    setIsUploading(true)
    setError(null)

    try {
      const uploaded = await uploadPropertyAsset(file, uploadPath)
      onChange({
        objectName: uploaded.objectName,
        url: uploaded.url,
      })
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload image.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {label}
          </p>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="rounded-none border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-600 transition-colors hover:border-primary hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {isUploading ? "Uploading" : value.url ? "Replace" : "Upload"}
          </button>
          {value.url ? (
            <button
              className="rounded-none border border-rose-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-600 transition-colors hover:border-rose-300 hover:text-rose-700"
              onClick={() => {
                setError(null)
                onChange({
                  objectName: null,
                  url: "",
                })
              }}
              type="button"
            >
              {"Remove"}
            </button>
          ) : null}
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""

          if (file) {
            void handleFileSelection(file)
          }
        }}
        ref={fileInputRef}
        type="file"
      />

      <div className="mt-5 overflow-hidden border border-slate-200 bg-white">
        {value.url ? (
          <img alt={label} className="h-56 w-full object-cover" src={value.url} />
        ) : (
          <div className="flex h-56 w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
            <AppIcon className="text-5xl" name="imagesmode" />
            <span className="mt-3 text-xs font-black uppercase tracking-[0.18em]">
              {"No image selected"}
            </span>
          </div>
        )}
      </div>

      {error ? (
        <p className="mt-3 text-sm font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function HomePageManagementPage() {
  const homepageSettingsQuery = useAdminHomePageSettings()
  const updateMutation = useUpdateHomePageSettings()
  const [formValues, setFormValues] = useState<HomePageSettings>(() =>
    cloneHomePageSettings(defaultHomePageSettings),
  )
  const [savedValues, setSavedValues] = useState<HomePageSettings>(() =>
    cloneHomePageSettings(defaultHomePageSettings),
  )

  useEffect(() => {
    if (!homepageSettingsQuery.data) {
      return
    }

    const nextValues = cloneHomePageSettings(homepageSettingsQuery.data)
    setFormValues(nextValues)
    setSavedValues(cloneHomePageSettings(nextValues))
  }, [homepageSettingsQuery.data])

  const hasPendingChanges = useMemo(
    () => JSON.stringify(formValues) !== JSON.stringify(savedValues),
    [formValues, savedValues],
  )

  function updateSettings(update: (current: HomePageSettings) => HomePageSettings) {
    setFormValues((current) => update(current))
  }

  async function handleSave() {
    const previousObjectNames = new Set(collectImageObjectNames(savedValues))
    const response = await updateMutation.mutateAsync(formValues)

    if (response.error || !response.data) {
      return
    }

    const nextValues = cloneHomePageSettings(response.data)
    setFormValues(nextValues)
    setSavedValues(cloneHomePageSettings(nextValues))

    const nextObjectNames = new Set(collectImageObjectNames(nextValues))
    const removedObjectNames = Array.from(previousObjectNames).filter((item) => !nextObjectNames.has(item))

    if (removedObjectNames.length > 0) {
      await Promise.allSettled(removedObjectNames.map((item) => deleteUploadedAsset(item)))
    }

    await fetch("/api/revalidate/homepage", {
      method: "POST",
    }).catch(() => null)
  }

  const isLoading = !homepageSettingsQuery.data && (homepageSettingsQuery.isLoading || homepageSettingsQuery.isFetching)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-5 lg:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-secondary">
              {"Admin Workspace"}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
              {"Homepage Content"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              {"Change homepage text and images without changing the layout. Featured properties, agents, and blog cards still come from their own live APIs."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center gap-2 rounded-none border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary"
              href="/"
              target="_blank"
            >
              <AppIcon className="text-lg" name="open_in_new" />
              {"Preview Homepage"}
            </Link>
            <button
              className="rounded-none border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
              disabled={!hasPendingChanges || updateMutation.isPending}
              onClick={() => setFormValues(cloneHomePageSettings(savedValues))}
              type="button"
            >
              {"Reset Changes"}
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-none bg-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={updateMutation.isPending || isLoading}
              onClick={() => void handleSave()}
              type="button"
            >
              <AppIcon className="text-lg" name="save" />
              {updateMutation.isPending ? "Saving..." : "Save Homepage"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 lg:px-8">
        <section className="grid gap-4 md:grid-cols-3">
          <article className="border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {"Status"}
            </p>
            <p className="mt-3 text-2xl font-black text-slate-900">
              {isLoading ? "Loading..." : hasPendingChanges ? "Unsaved Changes" : "Synced"}
            </p>
          </article>
          <article className="border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {"Last Saved"}
            </p>
            <p className="mt-3 text-lg font-black text-slate-900">
              {formatUpdatedAt(savedValues.updatedAt)}
            </p>
          </article>
          <article className="border border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              {"Live Sections"}
            </p>
            <p className="mt-3 text-2xl font-black text-slate-900">
              {"7 Editable Blocks"}
            </p>
          </article>
        </section>

        {homepageSettingsQuery.error ? (
          <section className="border border-rose-200 bg-rose-50 px-6 py-5">
            <p className="text-sm font-bold text-rose-700">
              {homepageSettingsQuery.error.message}
            </p>
          </section>
        ) : null}

        <SectionCard
          description="Update the hero headline, background image, and the search tab labels users see first."
          title="Hero Section"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              label="Headline"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  hero: { ...current.hero, headline: value },
                }))}
              placeholder="Main hero headline"
              value={formValues.hero.headline}
            />
            <Field
              label="Highlighted Headline"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  hero: { ...current.hero, highlightedHeadline: value },
                }))}
              placeholder="Accent hero headline"
              value={formValues.hero.highlightedHeadline}
            />
          </div>

          <TextAreaField
            label="Description"
            onChange={(value) =>
              updateSettings((current) => ({
                ...current,
                hero: { ...current.hero, description: value },
              }))}
            placeholder="Short paragraph under the main headline"
            rows={4}
            value={formValues.hero.description}
          />

          <ImageUploadField
            description="Large hero background image shown behind the search form."
            label="Hero Background"
            onChange={(value) =>
              updateSettings((current) => ({
                ...current,
                hero: { ...current.hero, backgroundImage: value },
              }))}
            uploadPath="homepage/hero"
            value={formValues.hero.backgroundImage}
          />

          <div className="grid gap-6 xl:grid-cols-3">
            {([
              ["buyMode", "Buy Tab"],
              ["rentMode", "Rent Tab"],
              ["sellMode", "Sell Tab"],
            ] as const).map(([modeKey, modeLabel]) => {
              const mode = formValues.hero[modeKey]

              return (
                <div key={modeKey} className="border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    {modeLabel}
                  </p>
                  <div className="mt-4 space-y-4">
                    <Field
                      label="Tab Label"
                      onChange={(value) =>
                        updateSettings((current) => ({
                          ...current,
                          hero: {
                            ...current.hero,
                            [modeKey]: { ...current.hero[modeKey], tabLabel: value },
                          },
                        }))}
                      placeholder="Buy"
                      value={mode.tabLabel}
                    />
                    <Field
                      label="Input Placeholder"
                      onChange={(value) =>
                        updateSettings((current) => ({
                          ...current,
                          hero: {
                            ...current.hero,
                            [modeKey]: { ...current.hero[modeKey], inputPlaceholder: value },
                          },
                        }))}
                      placeholder="Search input placeholder"
                      value={mode.inputPlaceholder}
                    />
                    <Field
                      label="Select Label"
                      onChange={(value) =>
                        updateSettings((current) => ({
                          ...current,
                          hero: {
                            ...current.hero,
                            [modeKey]: { ...current.hero[modeKey], selectLabel: value },
                          },
                        }))}
                      placeholder="Select label"
                      value={mode.selectLabel}
                    />
                    <Field
                      label="CTA Label"
                      onChange={(value) =>
                        updateSettings((current) => ({
                          ...current,
                          hero: {
                            ...current.hero,
                            [modeKey]: { ...current.hero[modeKey], ctaLabel: value },
                          },
                        }))}
                      placeholder="Button text"
                      value={mode.ctaLabel}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          description="These headings stay above the live property cards pulled from the listings API."
          title="Featured Listings"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              label="Eyebrow"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  featuredListings: { ...current.featuredListings, eyebrow: value },
                }))}
              placeholder="Section eyebrow"
              value={formValues.featuredListings.eyebrow}
            />
            <Field
              label="Title"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  featuredListings: { ...current.featuredListings, title: value },
                }))}
              placeholder="Section title"
              value={formValues.featuredListings.title}
            />
          </div>
        </SectionCard>

        <SectionCard
          description="This section controls the trust copy, two supporting feature callouts, two number blocks, and two supporting images."
          title="Why Choose Us"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              label="Eyebrow"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  whyChooseUs: { ...current.whyChooseUs, eyebrow: value },
                }))}
              placeholder="Small label above title"
              value={formValues.whyChooseUs.eyebrow}
            />
            <Field
              label="Title"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  whyChooseUs: { ...current.whyChooseUs, title: value },
                }))}
              placeholder="Section title"
              value={formValues.whyChooseUs.title}
            />
          </div>

          <TextAreaField
            label="Description"
            onChange={(value) =>
              updateSettings((current) => ({
                ...current,
                whyChooseUs: { ...current.whyChooseUs, description: value },
              }))}
            placeholder="Supporting copy under the title"
            rows={5}
            value={formValues.whyChooseUs.description}
          />

          <div className="grid gap-6 xl:grid-cols-2">
            {formValues.whyChooseUs.features.map((feature, index) => (
              <div key={`feature-${index}`} className="border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {`Feature ${index + 1}`}
                </p>
                <div className="mt-4 space-y-4">
                  <Field
                    label="Title"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        whyChooseUs: {
                          ...current.whyChooseUs,
                          features: current.whyChooseUs.features.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, title: value } : item,
                          ),
                        },
                      }))}
                    placeholder="Feature title"
                    value={feature.title}
                  />
                  <TextAreaField
                    label="Description"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        whyChooseUs: {
                          ...current.whyChooseUs,
                          features: current.whyChooseUs.features.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, description: value } : item,
                          ),
                        },
                      }))}
                    placeholder="Feature description"
                    rows={3}
                    value={feature.description}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {formValues.whyChooseUs.stats.map((stat, index) => (
              <div key={`stat-${index}`} className="border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {`Stat Block ${index + 1}`}
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field
                    label="Value"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        whyChooseUs: {
                          ...current.whyChooseUs,
                          stats: current.whyChooseUs.stats.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, value } : item,
                          ),
                        },
                      }))}
                    placeholder="25+"
                    value={stat.value}
                  />
                  <Field
                    label="Label"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        whyChooseUs: {
                          ...current.whyChooseUs,
                          stats: current.whyChooseUs.stats.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, label: value } : item,
                          ),
                        },
                      }))}
                    placeholder="Years Experience"
                    value={stat.label}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ImageUploadField
              description="Top-left photo inside the trust section grid."
              label="Primary Image"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  whyChooseUs: { ...current.whyChooseUs, primaryImage: value },
                }))}
              uploadPath="homepage/why-choose-us"
              value={formValues.whyChooseUs.primaryImage}
            />
            <ImageUploadField
              description="Bottom-right photo inside the trust section grid."
              label="Secondary Image"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  whyChooseUs: { ...current.whyChooseUs, secondaryImage: value },
                }))}
              uploadPath="homepage/why-choose-us"
              value={formValues.whyChooseUs.secondaryImage}
            />
          </div>
        </SectionCard>

        <SectionCard
          description="These four cards keep the same masonry layout. Only the copy and images change."
          title="Neighborhoods"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              label="Eyebrow"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  neighborhoods: { ...current.neighborhoods, eyebrow: value },
                }))}
              placeholder="Section eyebrow"
              value={formValues.neighborhoods.eyebrow}
            />
            <Field
              label="Title"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  neighborhoods: { ...current.neighborhoods, title: value },
                }))}
              placeholder="Section title"
              value={formValues.neighborhoods.title}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {formValues.neighborhoods.cards.map((card, index) => (
              <div key={`neighborhood-${index}`} className="border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {`Card ${index + 1}`}
                </p>
                <div className="mt-4 space-y-4">
                  <Field
                    label="Neighborhood Name"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        neighborhoods: {
                          ...current.neighborhoods,
                          cards: current.neighborhoods.cards.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: value } : item,
                          ),
                        },
                      }))}
                    placeholder="Neighborhood name"
                    value={card.name}
                  />
                  <Field
                    label="Property Count Label"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        neighborhoods: {
                          ...current.neighborhoods,
                          cards: current.neighborhoods.cards.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, propertyCountLabel: value } : item,
                          ),
                        },
                      }))}
                    placeholder="128 Properties"
                    value={card.propertyCountLabel}
                  />
                  <ImageUploadField
                    description="Background image for this neighborhood tile."
                    label={`Neighborhood Image ${index + 1}`}
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        neighborhoods: {
                          ...current.neighborhoods,
                          cards: current.neighborhoods.cards.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, image: value } : item,
                          ),
                        },
                      }))}
                    uploadPath="homepage/neighborhoods"
                    value={card.image}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          description="Service cards keep their icons and layout. You can change each title, paragraph, and link label."
          title="Services"
        >
          <div className="grid gap-6 xl:grid-cols-3">
            {formValues.services.map((service, index) => (
              <div key={`service-${index}`} className="border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {`Service ${index + 1}`}
                </p>
                <div className="mt-4 space-y-4">
                  <Field
                    label="Title"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        services: current.services.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: value } : item,
                        ),
                      }))}
                    placeholder="Service title"
                    value={service.title}
                  />
                  <TextAreaField
                    label="Description"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        services: current.services.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, description: value } : item,
                        ),
                      }))}
                    placeholder="Service description"
                    rows={4}
                    value={service.description}
                  />
                  <Field
                    label="Link Label"
                    onChange={(value) =>
                      updateSettings((current) => ({
                        ...current,
                        services: current.services.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, linkLabel: value } : item,
                        ),
                      }))}
                    placeholder="Learn More"
                    value={service.linkLabel}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          description="The cards still come from live agent data. This only controls the section intro and CTA button text."
          title="Team Section"
        >
          <div className="grid gap-6 xl:grid-cols-3">
            <Field
              label="Eyebrow"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  team: { ...current.team, eyebrow: value },
                }))}
              placeholder="Section eyebrow"
              value={formValues.team.eyebrow}
            />
            <Field
              label="Title"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  team: { ...current.team, title: value },
                }))}
              placeholder="Section title"
              value={formValues.team.title}
            />
            <Field
              label="Button Label"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  team: { ...current.team, buttonLabel: value },
                }))}
              placeholder="View All Agents"
              value={formValues.team.buttonLabel}
            />
          </div>
        </SectionCard>

        <SectionCard
          description="The testimonial quote, customer identity, and avatar image can all be changed here."
          title="Testimonial"
        >
          <TextAreaField
            label="Quote"
            onChange={(value) =>
              updateSettings((current) => ({
                ...current,
                testimonial: { ...current.testimonial, quote: value },
              }))}
            placeholder="Customer quote"
            rows={5}
            value={formValues.testimonial.quote}
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Field
              label="Customer Name"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  testimonial: { ...current.testimonial, name: value },
                }))}
              placeholder="Customer name"
              value={formValues.testimonial.name}
            />
            <Field
              label="Customer Role"
              onChange={(value) =>
                updateSettings((current) => ({
                  ...current,
                  testimonial: { ...current.testimonial, role: value },
                }))}
              placeholder="New Home Owner, Malibu"
              value={formValues.testimonial.role}
            />
          </div>
          <ImageUploadField
            description="Small round avatar image shown beside the testimonial author details."
            label="Testimonial Avatar"
            onChange={(value) =>
              updateSettings((current) => ({
                ...current,
                testimonial: { ...current.testimonial, avatarImage: value },
              }))}
            uploadPath="homepage/testimonial"
            value={formValues.testimonial.avatarImage}
          />
        </SectionCard>
      </main>
    </div>
  )
}
