/* eslint-disable @next/next/no-img-element */


import { AppIcon } from "@/components/ui/app-icon"

export function WhyChooseUsSection() {
  return (
    <section className="py-20 px-4 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {"Why EliteEstates"}
            </span>
            <h2 className="text-4xl font-black text-primary mt-4 mb-6 leading-tight">
              {"Elevating the Real Estate Experience Since 1998"}
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {"We don't just sell properties; we facilitate transitions into your future. Our commitment to transparency, local expertise, and innovative marketing sets us apart in a crowded market."}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex gap-4">
                <AppIcon className="text-accent text-3xl" name="verified" />
                <div>
                  <h4 className="font-bold text-primary">
                    {"Certified Agents"}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {"Expert guidance you can rely on."}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <AppIcon className="text-accent text-3xl" name="trending_up" />
                <div>
                  <h4 className="font-bold text-primary">
                    {"Market Insights"}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {"Data-driven valuation models."}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img
              alt="Agent meeting clients"
              className="w-full h-64 object-cover border border-slate-100"
              data-alt="Real estate agent showing house plans to clients"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzfTEUH3HlsLSxWKT-Tpv7iDN8YMHRtogYjQi3GEn_U210Dk0qVGRG55NDvfR3GDGnFVfKlb4tLLBsMhJ08A8Sm7EMo8ukgFd3gUH7CYyut3fmRTl2S6t3gDTzm4u5oRfxg0mmVY27gAvBkbzkqKTqc74kVnVbwvy44mUuvPPTxMqin5-5hxoid8k4GRgIxn_VYmobQTqHObf-Os7SUJ3DxOrqil5ptmYRBVKwLl-8heJd-ZrHQZtIbWQAVB7SEMG8jWQv7HNQmUc"
            />
            <div className="bg-primary p-8 flex flex-col justify-center text-white">
              <span className="text-5xl font-black mb-2">
                {"25+"}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest">
                {"Years Experience"}
              </span>
            </div>
            <div className="bg-secondary p-8 flex flex-col justify-center text-white">
              <span className="text-5xl font-black mb-2">
                {"12k"}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest">
                {"Properties Sold"}
              </span>
            </div>
            <img
              alt="Modern architecture"
              className="w-full h-64 object-cover border border-slate-100"
              data-alt="Modern high-rise building with glass windows"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnbKru90O2oNx5V3wCiUt1M6BHkl-dZyTe-7-enNpiiv7VrJa46KmvT7ip5YJKVur4LPJhec18E_YiJAPjByspR7IXiYwmwdzBTv9b11BQG3pGU4q_Ioid_aNr5-W4b3yZaonNPHp8ZNTNrErNWy3kQWHgdQewJQLFpwBX791QR92xJX8U81x3p5ixVbWLV5rhOc9zWAEJYvvH_Aze7PedIvA1AeHbfwpQROPcozE9RXlIcY6FQavC5-vYF0dDZgkndSq4_vAxwYU"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
