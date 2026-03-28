import { PublicPrimaryNavbar } from "@/components/stitch/shared/public-site-navbar"
import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

import { NewsletterFooterSection } from "./newsletter-footer-section"
import { PublicContactMainApiSection } from "./public-contact-main-section"

function getLocationLabel(location: string, index: number) {
  const primarySegment = location.split(",")[0]?.trim()
  return primarySegment?.length ? primarySegment : `Office ${index + 1}`
}

export async function PublicContactApiPage() {
  const agencySettings = await getPublicAgencySettings()
  const officeLocations = agencySettings.profile.officeLocations.filter((item) => item.trim().length > 0)
  const agencyLabel = agencySettings.profile.agencyName.trim() || "the team"

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PublicPrimaryNavbar />
      <section className="border-b border-primary/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
            {agencySettings.profile.agencyName ? `Contact ${agencySettings.profile.agencyName}` : "Contact The Team"}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-primary md:text-6xl">
            {`Reach ${agencyLabel} for buying, selling, valuation, or agent introductions.`}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
            {"Use the form below and our team will route you to the right specialist. If this is about a specific listing, include the property address and your timeline."}
          </p>
        </div>
      </section>
      <PublicContactMainApiSection profile={agencySettings.profile} />
      <section className="border-t border-primary/10 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-10">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
              {"Office Network"}
            </p>
            <h2 className="mt-3 text-4xl font-black text-primary">
              {"Visit one of our active markets"}
            </h2>
          </div>
          {officeLocations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {officeLocations.map((office, index) => (
                <article
                  key={`${office}-${index}`}
                  className="border border-slate-200 bg-background-light p-6"
                >
                  <h3 className="text-2xl font-black uppercase text-primary">
                    {getLocationLabel(office, index)}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {office}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-slate-200 bg-background-light p-6 text-sm font-semibold text-slate-500">
              {"No office locations have been added yet."}
            </div>
          )}
        </div>
      </section>
      <NewsletterFooterSection profile={agencySettings.profile} />
    </div>
  )
}
