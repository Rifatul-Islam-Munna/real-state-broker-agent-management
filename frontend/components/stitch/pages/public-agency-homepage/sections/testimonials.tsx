/* eslint-disable @next/next/no-img-element */


import type { HomePageTestimonialSection } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type TestimonialsSectionProps = {
  content: HomePageTestimonialSection
}

export function TestimonialsSection({ content }: TestimonialsSectionProps) {
  return (
    <section className="py-20 bg-white border-y border-slate-100">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <AppIcon className="text-accent text-6xl mb-6" name="format_quote" />
        <p className="text-2xl md:text-3xl font-medium text-slate-700 italic leading-relaxed mb-10">
          {content.quote}
        </p>
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
            <img
              alt="Client"
              className="w-full h-full object-cover"
              data-alt="Portrait of a satisfied male client"
              src={content.avatarImage.url}
            />
          </div>
          <div className="text-left">
            <h5 className="font-black text-primary uppercase text-sm">
              {content.name}
            </h5>
            <p className="text-slate-400 text-xs font-bold">
              {content.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
