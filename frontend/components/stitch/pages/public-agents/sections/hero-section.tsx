import Link from "next/link"

import { publicAgentsStats } from "@/static-data/pages/public-agents/data"

export function AgentsHeroSection() {
  return (
    <section className="border-b border-primary/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.4fr_1fr] md:px-8 lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
            {"EstateBlue Agents"}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-primary md:text-6xl">
            {"Find the right advisor for your market, timeline, and property goals."}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
            {"Our agents cover luxury residential, commercial, relocation, and investment transactions with local market depth and private client support."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="bg-primary px-6 py-3 text-sm font-bold text-white"
              href="/contact-us"
            >
              {"Talk To An Agent"}
            </Link>
            <Link
              className="border-2 border-primary px-6 py-3 text-sm font-bold text-primary"
              href="/property-search"
            >
              {"Browse Listings"}
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {publicAgentsStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-primary/10 bg-background-light p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-primary">
                    {stat.value}
                  </p>
                </div>
                <span className="material-symbols-outlined text-4xl text-accent">
                  {stat.icon}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
