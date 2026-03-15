/* eslint-disable @next/next/no-img-element */

export function TestimonialsSection() {
  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <span className="material-symbols-outlined text-accent text-6xl mb-6">
          {"format_quote"}
        </span>
        <p className="text-2xl md:text-3xl font-medium text-slate-700 italic leading-relaxed mb-10">
          {" \"Working with EliteEstates was a seamless experience. Their attention to detail and knowledge of the market enabled us to find our dream home in less than three weeks. Truly professional.\" "}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
            <img
              alt="Client"
              className="w-full h-full object-cover"
              data-alt="Portrait of a satisfied male client"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_aOT2jVaXNwSoeNzfL0WBIyo6No5zDE3lkpCeWtiy0YJlHYRlee9Y9PCWuTFQmw9-gz2MfchLZT89plYs-OMenN2QETPOwfF61fw0NH-SjW3KPZFHmBJJNi1vD9nkFoBfSY2JigvpV1ADtP62Ly4-ceJGyR_7jqFESGMTHvKdk0-E_YL47jfVDpLCgT-NaTany1ZONypLr_Bq0Ayi67S4wm8knrTZKdqjirNLlSuo1Gy9Jr-GqmL9cLBqfO66r175cIa4Axq3zB4"
            />
          </div>
          <div className="text-left">
            <h5 className="font-black text-primary uppercase text-sm">
              {"Jonathan Richards"}
            </h5>
            <p className="text-slate-400 text-xs font-bold">
              {"New Home Owner, Malibu"}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
