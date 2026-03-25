/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { NewsletterFooterSection } from "./newsletter-footer-section"
import { getPublicAgents } from "@/lib/public-real-estate-data"
import { AppIcon } from "@/components/ui/app-icon"

import { AgentsCtaSection } from "../public-agents/sections/cta-section"
import { AgentsHeroSection } from "../public-agents/sections/hero-section"
import { AgentsSpecialtiesSection } from "../public-agents/sections/specialties-section"

const fallbackImage = "https://placehold.co/640x960/e2e8f0/0f172a?text=Agent"

function roleLabel(agent: {
  agencyName?: string | null
  isVerifiedAgent: boolean
}) {
  if (agent.agencyName) {
    return agent.agencyName
  }

  if (agent.isVerifiedAgent) {
    return "Verified Advisor"
  }

  return "EstateBlue Agent"
}

export async function PublicAgentsApiPage() {
  const agents = await getPublicAgents()

  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <PublicPrimaryNavbar />
      <AgentsHeroSection />
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-10">
          <div className="mb-12 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
                {"Meet The Team"}
              </p>
              <h2 className="mt-3 text-4xl font-black text-primary">
                {"Advisors built for every client path"}
              </h2>
            </div>
            <Link
              className="hidden border-b-2 border-primary pb-1 text-xs font-black uppercase tracking-[0.24em] text-primary md:inline-block"
              href="/contact-us"
            >
              {"Request Introduction"}
            </Link>
          </div>
          {agents.length === 0 ? (
            <div className="border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
                {"No Public Agents Yet"}
              </p>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                {"Create active agent profiles in the backend and they will appear here automatically."}
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <article
                  key={agent.id}
                  className="overflow-hidden border border-slate-200 bg-white"
                >
                  <img
                    alt={agent.fullName}
                    className="h-80 w-full object-cover"
                    src={agent.avatarUrl ?? fallbackImage}
                  />
                  <div className="space-y-4 p-6">
                    <div>
                      <h3 className="text-2xl font-black uppercase text-primary">
                        {agent.fullName}
                      </h3>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                        {roleLabel(agent)}
                      </p>
                    </div>
                    <div className="grid gap-2 text-sm text-slate-600">
                      <p className="flex items-center gap-2">
                        <AppIcon className="text-base text-primary" name="verified" />
                        {agent.isVerifiedAgent ? "Verified public profile" : "Active agent profile"}
                      </p>
                      <p className="flex items-center gap-2">
                        <AppIcon className="text-base text-primary" name="home_work" />
                        {`${agent.propertyCount} Active Listings`}
                      </p>
                    </div>
                    <p className="text-sm leading-7 text-slate-600">
                      {agent.bio || "Agent biography will appear here once it is added in the backend."}
                    </p>
                    <Link
                      className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-xs font-black uppercase tracking-[0.22em] text-primary"
                      href="/contact-us"
                    >
                      <AppIcon className="text-sm" name="mail" />
                      {"Contact Agent"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <AgentsSpecialtiesSection />
      <AgentsCtaSection />
      <NewsletterFooterSection />
    </div>
  )
}

