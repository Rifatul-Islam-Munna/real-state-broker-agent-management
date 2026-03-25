/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import type { HomePageTeamSection, PublicAgentProfile } from "@/@types/real-estate-api"

type MeetTheTeamSectionProps = {
  agents: PublicAgentProfile[]
  intro: HomePageTeamSection
}

const fallbackImage = "https://placehold.co/640x960/e2e8f0/0f172a?text=Agent"

function roleLabel(agent: PublicAgentProfile) {
  if (agent.agencyName) {
    return agent.agencyName
  }

  if (agent.isVerifiedAgent) {
    return "Verified Advisor"
  }

  return "EstateBlue Agent"
}

function imageForAgent(agent: PublicAgentProfile) {
  return agent.avatarUrl ?? fallbackImage
}

export function MeetTheTeamSection({ agents, intro }: MeetTheTeamSectionProps) {
  const featuredAgents = agents.slice(0, 4)

  return (
    <section className="bg-background-light py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-16 flex flex-col items-center justify-between md:flex-row">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {intro.eyebrow}
            </span>
            <h2 className="text-4xl font-black text-primary mt-2">
              {intro.title}
            </h2>
          </div>
          <Link
            className="mt-6 border-2 border-primary px-8 py-3 text-xs font-bold uppercase text-primary transition-all hover:bg-primary hover:text-white md:mt-0"
            href="/agents"
          >
            {intro.buttonLabel}
          </Link>
        </div>
        {featuredAgents.length === 0 ? (
          <div className="border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">
              {"No Public Agents Yet"}
            </p>
            <p className="mt-4 text-lg font-semibold text-slate-600">
              {"Create active agent profiles in the backend and the team section will update automatically."}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-4">
            {featuredAgents.map((agent) => (
              <div key={agent.id} className="bg-white border border-slate-200">
                <img
                  alt={agent.fullName}
                  className="h-80 w-full object-cover grayscale transition-all hover:grayscale-0"
                  src={imageForAgent(agent)}
                />
                <div className="p-6 text-center">
                  <h4 className="text-lg font-black text-primary uppercase">
                    {agent.fullName}
                  </h4>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                    {roleLabel(agent)}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    {`${agent.propertyCount} Active Listings`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
