import Link from "next/link"
import { AppIcon } from "@/components/ui/app-icon"

export function AgentsCtaSection() {
  return (
    <section className="border-t border-primary/10 bg-white py-16">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-accent">
            {"Next Step"}
          </p>
          <h2 className="mt-3 text-3xl font-black text-primary">
            {"Tell us your goal and we will route you to the right agent"}
          </h2>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 bg-primary px-6 py-3 text-sm font-bold text-white"
          href="/contact-us"
        >
          <AppIcon className="text-lg" name="arrow_forward" />
          {"Start Conversation"}
        </Link>
      </div>
    </section>
  )
}
