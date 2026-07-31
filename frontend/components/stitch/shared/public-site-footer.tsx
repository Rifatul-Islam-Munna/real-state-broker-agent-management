import Link from "next/link"
import { Globe2 } from "lucide-react"

import { getPublicAgencySettings } from "@/lib/public-real-estate-data"

export async function PublicSiteFooter() {
  const agency = await getPublicAgencySettings()
  const brand = agency.profile.agencyName || "Ether Real Estate"

  return (
    <footer className="bg-[#07192d] py-14 text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
        <div>
          <div className="flex items-center gap-2 font-bold"><Globe2 className="h-4 w-4 text-[#c1c1ff]" />{brand}</div>
          <p className="mt-4 max-w-xs text-xs leading-5 text-slate-400">Premium real estate advisory, property discovery, and portfolio support built around your goals.</p>
        </div>
        <div>
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#c1c1ff]">Navigation</h3>
          <div className="mt-4 grid gap-3 text-xs text-slate-300">
            <Link href="/property-search">Properties</Link>
            <Link href="/agents">Agents</Link>
            <Link href="/blog">Blog</Link>
          </div>
        </div>
        <div>
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#c1c1ff]">Contact</h3>
          <div className="mt-4 grid gap-3 text-xs text-slate-300"><p>{agency.profile.contactEmail}</p><p>{agency.profile.contactPhone}</p></div>
        </div>
        <div>
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#c1c1ff]">Office</h3>
          <div className="mt-4 grid gap-3 text-xs text-slate-300">{agency.profile.officeLocations.slice(0, 2).map((office) => <p key={office}>{office}</p>)}</div>
        </div>
      </div>
    </footer>
  )
}
