/* eslint-disable @next/next/no-img-element */

"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import type { PublicAgentProfile } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

const fallbackImage = "https://placehold.co/640x760/e2e8f0/0f172a?text=Agent"

export function PublicAgentDirectory({
  agents,
  heading,
  eyebrow,
  description,
  directoryHeading,
}: {
  agents: PublicAgentProfile[]
  heading: string
  eyebrow: string
  description: string
  directoryHeading: string
}) {
  const [query, setQuery] = useState("")

  const filteredAgents = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return agents

    return agents.filter((agent) =>
      [agent.fullName, agent.agencyName, agent.bio]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(value)),
    )
  }, [agents, query])

  return (
    <>
      <section className="border-b border-slate-200 bg-[#f8f9ff] py-14 sm:py-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 sm:px-8 lg:grid-cols-[1fr_.9fr] lg:px-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#4343d5]">{eyebrow}</p>
            <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-[-0.04em] text-[#0b1c30] sm:text-5xl">{heading}</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">{description}</p>

            <div className="mt-7 flex max-w-2xl flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-xl bg-[#eff2ff] px-4">
                <AppIcon name="search" className="text-lg text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, agency, or specialty"
                  className="w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              <button type="button" className="rounded-xl bg-[#4343d5] px-7 py-3 text-sm font-bold text-white">Search</button>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(67,67,213,.09)]">
            <div className="grid grid-cols-3 gap-3">
              {agents.slice(0, 3).map((agent) => (
                <img key={agent.id} src={agent.avatarUrl || fallbackImage} alt={agent.fullName} className="aspect-[.82] w-full rounded-2xl object-cover" />
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#eff4ff] px-5 py-4">
              <div><p className="text-2xl font-black text-[#4343d5]">{agents.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Active advisors</p></div>
              <div><p className="text-2xl font-black text-[#006b5f]">{agents.filter((agent) => agent.isVerifiedAgent).length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Verified profiles</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8f9ff] py-14">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div><h2 className="text-2xl font-bold tracking-tight text-[#0b1c30]">{directoryHeading}</h2><p className="mt-1 text-sm text-slate-500">{filteredAgents.length} advisor{filteredAgents.length === 1 ? "" : "s"} found</p></div>
          </div>

          {filteredAgents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No agents match your search.</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredAgents.map((agent) => (
                <article key={agent.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="relative h-72 overflow-hidden bg-slate-100">
                    <img src={agent.avatarUrl || fallbackImage} alt={agent.fullName} className="h-full w-full object-cover" />
                    {agent.isVerifiedAgent ? <span className="absolute right-4 top-4 rounded-full bg-[#4343d5] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white">Verified</span> : null}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><h3 className="text-lg font-bold text-[#0b1c30]">{agent.fullName}</h3><p className="mt-1 text-xs font-semibold text-[#4343d5]">{agent.agencyName || "Independent Advisor"}</p></div>
                      {agent.isVerifiedAgent ? <AppIcon name="verified" className="text-xl text-[#006b5f]" /> : null}
                    </div>
                    <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-600">{agent.bio || "Professional advisor profile information is managed from the admin dashboard."}</p>
                    <div className="mt-5 grid grid-cols-2 border-y border-slate-100 py-4 text-center">
                      <div><strong className="block text-xl text-[#0b1c30]">{agent.propertyCount}</strong><span className="text-[9px] uppercase tracking-wider text-slate-400">Listings</span></div>
                      <div><strong className="block text-xl text-[#0b1c30]">{agent.isVerifiedAgent ? "Yes" : "Active"}</strong><span className="text-[9px] uppercase tracking-wider text-slate-400">Verified</span></div>
                    </div>
                    <Link
                      href={`/contact-us?agentId=${agent.id}&agentName=${encodeURIComponent(agent.fullName)}&agencyName=${encodeURIComponent(agent.agencyName || "Independent Advisor")}&verified=${agent.isVerifiedAgent ? "true" : "false"}`}
                      className="mt-5 flex w-full items-center justify-center rounded-lg bg-[#4343d5] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3434b8]"
                    >
                      Contact Us
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
