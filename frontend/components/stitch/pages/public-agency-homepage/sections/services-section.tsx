export function ServicesSection() {
  return (
    <section className="py-24 bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          <div className="p-8 border border-white/10 hover:border-accent transition-colors">
            <span className="material-symbols-outlined text-5xl text-accent mb-6">
              {"assessment"}
            </span>
            <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">
              {"Property Valuation"}
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {"Receive a comprehensive market analysis and pinpoint accuracy for your property's value."}
            </p>
            <a
              className="text-xs font-black tracking-widest uppercase border-b-2 border-accent pb-1"
              href="#"
            >
              {"Learn More"}
            </a>
          </div>
          <div className="p-8 border border-white/10 hover:border-accent transition-colors">
            <span className="material-symbols-outlined text-5xl text-accent mb-6">
              {"handshake"}
            </span>
            <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">
              {"Consulting"}
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {"Expert advisory for investment portfolios, residential acquisitions, and commercial projects."}
            </p>
            <a
              className="text-xs font-black tracking-widest uppercase border-b-2 border-accent pb-1"
              href="#"
            >
              {"Learn More"}
            </a>
          </div>
          <div className="p-8 border border-white/10 hover:border-accent transition-colors">
            <span className="material-symbols-outlined text-5xl text-accent mb-6">
              {"corporate_fare"}
            </span>
            <h3 className="text-2xl font-bold mb-4 uppercase tracking-tighter">
              {"Asset Management"}
            </h3>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              {"Full-cycle property management focused on maximizing yield and tenant satisfaction."}
            </p>
            <a
              className="text-xs font-black tracking-widest uppercase border-b-2 border-accent pb-1"
              href="#"
            >
              {"Learn More"}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
