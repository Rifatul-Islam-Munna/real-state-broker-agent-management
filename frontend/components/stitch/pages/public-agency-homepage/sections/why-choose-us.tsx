/* eslint-disable @next/next/no-img-element */


import type { HomePageWhyChooseUsSection } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type WhyChooseUsSectionProps = {
  content: HomePageWhyChooseUsSection
}

export function WhyChooseUsSection({ content }: WhyChooseUsSectionProps) {
  const featureOne = content.features[0]
  const featureTwo = content.features[1]
  const statOne = content.stats[0]
  const statTwo = content.stats[1]

  return (
    <section className="py-20 px-4 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {content.eyebrow}
            </span>
            <h2 className="text-4xl font-black text-primary mt-4 mb-6 leading-tight">
              {content.title}
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              {content.description}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex gap-4">
                <AppIcon className="text-accent text-3xl" name="verified" />
                <div>
                  <h4 className="font-bold text-primary">
                    {featureOne?.title}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {featureOne?.description}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <AppIcon className="text-accent text-3xl" name="trending_up" />
                <div>
                  <h4 className="font-bold text-primary">
                    {featureTwo?.title}
                  </h4>
                  <p className="text-sm text-slate-500">
                    {featureTwo?.description}
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
              src={content.primaryImage.url}
            />
            <div className="bg-primary p-8 flex flex-col justify-center text-white">
              <span className="text-5xl font-black mb-2">
                {statOne?.value}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest">
                {statOne?.label}
              </span>
            </div>
            <div className="bg-secondary p-8 flex flex-col justify-center text-white">
              <span className="text-5xl font-black mb-2">
                {statTwo?.value}
              </span>
              <span className="text-sm font-bold uppercase tracking-widest">
                {statTwo?.label}
              </span>
            </div>
            <img
              alt="Modern architecture"
              className="w-full h-64 object-cover border border-slate-100"
              data-alt="Modern high-rise building with glass windows"
              src={content.secondaryImage.url}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
