/* eslint-disable @next/next/no-img-element */

import type { HomePageNeighborhoodSection } from "@/@types/real-estate-api"

type PropertiesByNeighborhoodSectionProps = {
  content: HomePageNeighborhoodSection
}

export function PropertiesByNeighborhoodSection({ content }: PropertiesByNeighborhoodSectionProps) {
  const firstCard = content.cards[0]!
  const secondCard = content.cards[1]!
  const thirdCard = content.cards[2]!
  const fourthCard = content.cards[3]!

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-bold tracking-widest uppercase text-xs">
            {content.eyebrow}
          </span>
          <h2 className="text-4xl font-black text-primary mt-2">
            {content.title}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
          <div className="md:col-span-2 md:row-span-2 relative group overflow-hidden border border-slate-100">
            <img
              alt="Manhattan Skyline"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              data-alt="Aerial view of Manhattan skyline during sunset"
              src={firstCard.image.url}
            />
            <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors">

            </div>
            <div className="absolute bottom-0 left-0 p-8">
              <h4 className="text-white text-3xl font-black uppercase">
                {firstCard.name}
              </h4>
              <p className="text-white/80 font-bold">
                {firstCard.propertyCountLabel}
              </p>
            </div>
          </div>
          <div className="relative group overflow-hidden border border-slate-100">
            <img
              alt="Miami beach houses"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              data-alt="Modern houses along the Miami coastline"
              src={secondCard.image.url}
            />
            <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors">

            </div>
            <div className="absolute bottom-0 left-0 p-6">
              <h4 className="text-white text-xl font-black uppercase">
                {secondCard.name}
              </h4>
              <p className="text-white/80 text-sm font-bold">
                {secondCard.propertyCountLabel}
              </p>
            </div>
          </div>
          <div className="relative group overflow-hidden border border-slate-100">
            <img
              alt="Parisian apartments"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              data-alt="Classic Parisian apartment buildings"
              src={thirdCard.image.url}
            />
            <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors">

            </div>
            <div className="absolute bottom-0 left-0 p-6">
              <h4 className="text-white text-xl font-black uppercase">
                {thirdCard.name}
              </h4>
              <p className="text-white/80 text-sm font-bold">
                {thirdCard.propertyCountLabel}
              </p>
            </div>
          </div>
          <div className="md:col-span-2 relative group overflow-hidden border border-slate-100">
            <img
              alt="San Francisco Bridge"
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
              data-alt="Golden Gate Bridge in San Francisco"
              src={fourthCard.image.url}
            />
            <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors">

            </div>
            <div className="absolute bottom-0 left-0 p-6">
              <h4 className="text-white text-2xl font-black uppercase">
                {fourthCard.name}
              </h4>
              <p className="text-white/80 text-sm font-bold">
                {fourthCard.propertyCountLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
