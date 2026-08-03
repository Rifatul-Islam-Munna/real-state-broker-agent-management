import { headers } from "next/headers"
import { notFound } from "next/navigation"
import Script from "next/script"
import { Building2, Mail, MapPin, Phone } from "lucide-react"

type TenantSite = {
  tenant: {
    id: number
    businessName: string
    slug: string
    subdomain: string
    dashboardPermissions: string[]
  }
  branding: { primaryColor?: string; logoUrl?: string; tagline?: string }
  homepage: { headline?: string; description?: string; phone?: string; email?: string; address?: string }
  contactForm: { enabled?: boolean }
  gtm: { containerId: string | null; enabled: boolean }
  listings: Array<{ id: number; title: string; status: string; payload: Record<string, unknown> }>
}

async function getTenantSite(host: string): Promise<TenantSite | null> {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api").replace(/\/$/, "")
  try {
    const response = await fetch(`${apiBase}/tenant-public/site`, {
      cache: "no-store",
      headers: { "x-tenant-host": host },
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export default async function TenantSitePage() {
  const requestHeaders = await headers()
  const host = requestHeaders.get("x-tenant-host") ?? requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  const site = await getTenantSite(host)
  if (!site) notFound()

  const primary = site.branding.primaryColor || "#4343d5"
  const headline = site.homepage.headline || `Find your next property with ${site.tenant.businessName}`
  const description = site.homepage.description || "Explore available properties and connect with our real estate team."

  const gtmId = site.gtm.enabled && site.gtm.containerId && /^GTM-[A-Z0-9]{5,20}$/.test(site.gtm.containerId) ? site.gtm.containerId : null

  return (
    <>
      {gtmId ? (
        <>
          <Script id="tenant-gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}</Script>
          <noscript><iframe height="0" src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`} style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" width="0" /></noscript>
        </>
      ) : null}
      <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            {site.branding.logoUrl ? <img alt={site.tenant.businessName} className="h-10 w-auto" src={site.branding.logoUrl} /> : <span className="flex size-10 items-center justify-center rounded-xl text-white" style={{ backgroundColor: primary }}><Building2 className="size-5" /></span>}
            <div><p className="font-bold">{site.tenant.businessName}</p><p className="text-xs text-slate-500">{site.branding.tagline || "Real estate professionals"}</p></div>
          </div>
          <a className="rounded-lg px-4 py-2 text-sm font-semibold text-white" href="#contact" style={{ backgroundColor: primary }}>Contact us</a>
        </div>
      </header>

      <section className="bg-slate-950 px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: primary }}>Welcome</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-[-0.045em] sm:text-5xl lg:text-6xl">{headline}</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/65 sm:text-lg">{description}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: primary }}>Listings</p><h2 className="mt-2 text-3xl font-bold">Featured properties</h2></div></div>
        {site.listings.length ? <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{site.listings.map((listing) => <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" key={listing.id}><div className="aspect-[16/10] bg-slate-100" /><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{listing.status}</p><h3 className="mt-2 text-lg font-bold">{listing.title}</h3></div></article>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">No published listings yet.</div>}
      </section>

      <section className="bg-slate-50 px-5 py-16 sm:px-8 lg:px-10" id="contact">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: primary }}>Contact</p><h2 className="mt-2 text-3xl font-bold">Talk with our team</h2><div className="mt-6 space-y-3 text-sm text-slate-600">{site.homepage.phone ? <p className="flex items-center gap-3"><Phone className="size-4" />{site.homepage.phone}</p> : null}{site.homepage.email ? <p className="flex items-center gap-3"><Mail className="size-4" />{site.homepage.email}</p> : null}{site.homepage.address ? <p className="flex items-center gap-3"><MapPin className="size-4" />{site.homepage.address}</p> : null}</div></div>
          {site.contactForm.enabled !== false ? <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6"><input className="h-12 rounded-lg border px-4" placeholder="Your name" /><input className="h-12 rounded-lg border px-4" placeholder="Email" type="email" /><textarea className="min-h-32 rounded-lg border p-4" placeholder="How can we help?" /><button className="h-12 rounded-lg font-semibold text-white" style={{ backgroundColor: primary }} type="button">Send inquiry</button></form> : null}
        </div>
      </section>
      </main>
    </>
  )
}
