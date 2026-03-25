import { publicOfficeLocations } from "@/data/page-content"

export function ContactLocationsSection() {
  return (
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
        <div className="grid gap-6 md:grid-cols-3">
          {publicOfficeLocations.map((office) => (
            <article
              key={office.city}
              className="border border-slate-200 bg-background-light p-6"
            >
              <h3 className="text-2xl font-black uppercase text-primary">
                {office.city}
              </h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                {office.address}
              </p>
              <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-accent">
                {office.schedule}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
