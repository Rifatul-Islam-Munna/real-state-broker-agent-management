
import type { HomePageServiceCard } from "@/@types/real-estate-api"
import { AppIcon } from "@/components/ui/app-icon"

type ServicesSectionProps = {
  items: HomePageServiceCard[]
}

const serviceIcons = ["assessment", "handshake", "corporate_fare"] as const

export function ServicesSection({ items }: ServicesSectionProps) {
  return (
    <section className="py-24 bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className="p-8 border border-white/10 hover:border-accent transition-colors">
              <AppIcon className="text-5xl text-accent mb-6" name={serviceIcons[index] ?? "star"} />
              <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">
                {item.title}
              </h3>
              <p className="text-white/70 text-sm leading-relaxed mb-6">
                {item.description}
              </p>
              <a
                className="text-xs font-black tracking-widest uppercase border-b-2 border-accent pb-1"
                href="#"
              >
                {item.linkLabel}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
