/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { publicAgents } from "@/static-data/pages/public-agents/data"

export function AgentsGridSection() {
  return (
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
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {publicAgents.map((agent) => (
            <article
              key={agent.name}
              className="overflow-hidden border border-slate-200 bg-white"
            >
              <img
                alt={agent.name}
                className="h-80 w-full object-cover"
                src={agent.imageSrc}
              />
              <div className="space-y-4 p-6">
                <div>
                  <h3 className="text-2xl font-black uppercase text-primary">
                    {agent.name}
                  </h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-accent">
                    {agent.role}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">
                      {"verified"}
                    </span>
                    {agent.specialty}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-primary">
                      {"location_on"}
                    </span>
                    {agent.location}
                  </p>
                </div>
                <p className="text-sm leading-7 text-slate-600">
                  {agent.bio}
                </p>
                <Link
                  className="inline-flex items-center gap-2 border-b-2 border-primary pb-1 text-xs font-black uppercase tracking-[0.22em] text-primary"
                  href="/contact-us"
                >
                  <span className="material-symbols-outlined text-sm">
                    {"mail"}
                  </span>
                  {"Contact Agent"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
