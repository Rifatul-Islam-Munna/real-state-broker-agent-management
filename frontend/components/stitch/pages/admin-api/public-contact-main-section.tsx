"use client"

import { useState } from "react"
import { sileo } from "sileo"

import type { PublicAgencyProfileSettings } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateContactRequest } from "@/hooks/use-real-estate-api"
import { agencySocialPlatformOptions, getConfiguredAgencySocialLinks } from "@/lib/agency-social-links"

const inquiryTypes = [
  "Buying",
  "Selling",
  "Property Valuation",
  "Agent Introduction",
] as const

export function PublicContactMainApiSection({
  profile,
}: {
  profile: PublicAgencyProfileSettings
}) {
  const [activeInquiry, setActiveInquiry] = useState<(typeof inquiryTypes)[number]>("Buying")
  const createContactRequest = useCreateContactRequest()
  const [formState, setFormState] = useState({
    email: "",
    message: "",
    name: "",
    phone: "",
  })
  const configuredSocialLinks = getConfiguredAgencySocialLinks(profile.socialLinks)
  const primaryOfficeLocation =
    profile.officeLocations.find((item) => item.trim().length > 0) ??
    "Office location not added yet"
  const contactMethods = [
    {
      title: "General inquiries",
      detail: profile.contactEmail || "Contact email not added yet",
      icon: "mail",
    },
    {
      title: "Call our desk",
      detail: profile.contactPhone || "Phone number not added yet",
      icon: "call",
    },
    {
      title: "Visit headquarters",
      detail: primaryOfficeLocation,
      icon: "location_on",
    },
  ] as const

  function showValidationError(description: string) {
    sileo.error({ title: "Check the form", description })
  }

  return (
    <section className="bg-muted/20 py-12 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:px-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{"Tell us how we can help"}</CardTitle>
            <CardDescription>
              {"Choose an inquiry type and share the details your advisor should know."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inquiry type">
              {inquiryTypes.map((type) => (
                <Button
                  aria-selected={type === activeInquiry}
                  key={type}
                  onClick={() => setActiveInquiry(type)}
                  role="tab"
                  size="sm"
                  type="button"
                  variant={type === activeInquiry ? "default" : "outline"}
                >
                  {type}
                </Button>
              ))}
            </div>

            <form
              className="mt-6 grid gap-5 md:grid-cols-2"
              onSubmit={async (event) => {
                event.preventDefault()

                if (!formState.name.trim()) {
                  showValidationError("Full name is required.")
                  return
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) {
                  showValidationError("Enter a valid email address.")
                  return
                }

                if (!formState.phone.trim()) {
                  showValidationError("Phone number is required.")
                  return
                }

                if (formState.message.trim().length < 20) {
                  showValidationError("Message must be at least 20 characters.")
                  return
                }

                const response = await createContactRequest.mutateAsync({
                  email: formState.email.trim(),
                  inquiryType: activeInquiry,
                  message: formState.message.trim(),
                  name: formState.name.trim(),
                  phone: formState.phone.trim(),
                })

                if (response.error) return

                setFormState({ email: "", message: "", name: "", phone: "" })
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="contact-name">{"Full name"}</Label>
                <Input
                  id="contact-name"
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }}
                  placeholder="Your full name"
                  type="text"
                  value={formState.name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">{"Email address"}</Label>
                <Input
                  id="contact-email"
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, email: event.target.value }))
                  }}
                  placeholder="you@example.com"
                  type="email"
                  value={formState.email}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">{"Phone number"}</Label>
                <Input
                  id="contact-phone"
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, phone: event.target.value }))
                  }}
                  placeholder="Your phone number"
                  type="tel"
                  value={formState.phone}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-inquiry">{"Inquiry type"}</Label>
                <Input id="contact-inquiry" readOnly type="text" value={activeInquiry} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contact-message">{"Message"}</Label>
                <Textarea
                  id="contact-message"
                  className="min-h-40"
                  onChange={(event) => {
                    setFormState((current) => ({ ...current, message: event.target.value }))
                  }}
                  placeholder="Tell us what you need and include any listing or location details."
                  value={formState.message}
                />
              </div>
              <Button
                className="md:col-span-2 md:w-fit"
                disabled={createContactRequest.isPending}
                size="lg"
                type="submit"
              >
                {createContactRequest.isPending ? "Sending..." : "Send inquiry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <aside className="grid gap-4">
          {contactMethods.map((method) => (
            <Card key={method.title} size="sm">
              <CardContent className="flex items-start gap-3 pt-1">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <AppIcon className="text-xl" name={method.icon} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {method.title}
                  </p>
                  <p className="mt-1 break-words font-semibold">{method.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle>{"Social channels"}</CardTitle>
              <CardDescription>{"Connect with the agency on your preferred platform."}</CardDescription>
            </CardHeader>
            <CardContent>
              {configuredSocialLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {configuredSocialLinks.map((link) => {
                    const platform = agencySocialPlatformOptions.find(
                      (item) => item.platform === link.platform,
                    )

                    return (
                      <Button
                        key={link.platform}
                        render={
                          <a href={link.url} rel="noreferrer" target="_blank" />
                        }
                        size="sm"
                        variant="outline"
                      >
                        <AppIcon name={platform?.icon ?? "share"} />
                        {platform?.label ?? link.platform}
                      </Button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {"No social channels added yet in agency settings."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary text-primary-foreground">
            <CardHeader>
              <CardDescription className="text-primary-foreground/70">
                {"Response standard"}
              </CardDescription>
              <CardTitle className="text-3xl">{"Same-day reply"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-primary-foreground/75">
                {"Luxury inquiries and active listing requests are routed immediately to the appropriate advisor."}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  )
}
