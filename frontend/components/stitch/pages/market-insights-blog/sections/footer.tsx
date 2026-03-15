import Link from "next/link"
import { AppIcon } from "@/components/ui/app-icon"

export function FooterSection() {
  return (
    <footer className="bg-primary text-white py-16 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-white">
              <AppIcon className="text-3xl" name="domain" />
              <h2 className="text-xl font-bold tracking-tight">
                {"EstateBlue"}
              </h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              {" Redefining real estate through data, design, and dedicated service. Your trusted partner for market clarity. "}
            </p>
            <div className="flex gap-4">
              <a
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
                href="#"
              >
                <AppIcon className="text-sm" name="public" />
              </a>
              <a
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition-colors"
                href="#"
              >
                <AppIcon className="text-sm" name="alternate_email" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-accent">
              {"Quick Links"}
            </h4>
          <ul className="space-y-4 text-sm text-white/70">
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/market-insights"
              >
                {"Market Reports"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/property-search"
              >
                {"Property Search"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/profile/seller/list-your-property"
              >
                {"Sell Your Home"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/contact-us"
              >
                {"Contact Us"}
              </Link>
            </li>
          </ul>
        </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-accent">
              {"Company"}
            </h4>
          <ul className="space-y-4 text-sm text-white/70">
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/"
              >
                {"About Us"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/agents"
                >
                  {"Our Agents"}
                </Link>
            </li>
            <li>
              <Link
                className="hover:text-white transition-colors"
                href="/profile/buyer/wishlist"
              >
                {"Buyer Profile"}
              </Link>
            </li>
            <li>
              <a
                className="hover:text-white transition-colors"
                href="#"
                >
                  {"Privacy Policy"}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold uppercase tracking-widest text-xs mb-6 text-accent">
              {"Contact"}
            </h4>
            <ul className="space-y-4 text-sm text-white/70">
              <li className="flex items-start gap-3">
                <AppIcon className="text-accent text-sm" name="location_on" />
                <span>
                  {"123 Realty Plaza, Suite 400"}
                  <br />
                  {"San Francisco, CA 94103"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <AppIcon className="text-accent text-sm" name="phone" />
                <span>
                  {"(555) 123-4567"}
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/40 uppercase tracking-widest font-bold">
          <p>
            {" 2026 EstateBlue Realty Group. All Rights Reserved."}
          </p>
          <div className="flex gap-8">
            <a
              className="hover:text-white transition-colors"
              href="#"
            >
              {"Terms"}
            </a>
            <a
              className="hover:text-white transition-colors"
              href="#"
            >
              {"License"}
            </a>
            <a
              className="hover:text-white transition-colors"
              href="#"
            >
              {"Sitemap"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
