"use client"

import { useState } from "react"

import { publicAgentSpecialties } from "@/data/page-content"

export function AgentsSpecialtiesSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeSpecialty = publicAgentSpecialties[activeIndex]

  return (
    <section className="bg-primary py-20 text-white">
      <div className="mx-auto max-w-7xl px-4 md:px-8 lg:px-10">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
            {"Specialties"}
          </p>
          <h2 className="mt-3 text-4xl font-black">
            {"Interactive coverage across the business lines you actually need"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          {publicAgentSpecialties.map((specialty, index) => (
            <button
              key={specialty.title}
              className={index === activeIndex
                ? "bg-white px-5 py-3 text-sm font-bold text-primary"
                : "border border-white/20 px-5 py-3 text-sm font-bold text-white/80 transition-colors hover:border-accent hover:text-white"}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              {specialty.title}
            </button>
          ))}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-white/10 bg-white/5 p-8">
            <h3 className="text-3xl font-black">
              {activeSpecialty.title}
            </h3>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
              {activeSpecialty.description}
            </p>
          </div>
          <div className="grid gap-4">
            <div className="border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                {"Avg Response Time"}
              </p>
              <p className="mt-3 text-3xl font-black">
                {"< 15 min"}
              </p>
            </div>
            <div className="border border-white/10 bg-white/5 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                {"Client Match"}
              </p>
              <p className="mt-3 text-3xl font-black">
                {"Curated"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
