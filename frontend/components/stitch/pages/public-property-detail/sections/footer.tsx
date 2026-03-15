import Link from "next/link"
import { AppIcon } from "@/components/ui/app-icon"

export function FooterSection() {
  return (
    <footer className="bg-background-dark text-white mt-20 py-20 px-4 md:px-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 text-primary mb-6">
            <AppIcon className="text-3xl" name="domain" />
            <h1 className="text-xl font-800 tracking-tighter uppercase text-white">
              {"EstateBlue"}
            </h1>
          </div>
          <p className="text-slate-400 max-w-sm mb-8">
            {" Redefining luxury real estate through transparency, technology, and unmatched local expertise. "}
          </p>
          <div className="flex gap-4">
            <a
              className="w-10 h-10 border border-slate-700 flex items-center justify-center hover:bg-primary transition-colors"
              href="#"
            >
              {"FB"}
            </a>
            <a
              className="w-10 h-10 border border-slate-700 flex items-center justify-center hover:bg-primary transition-colors"
              href="#"
            >
              {"IN"}
            </a>
            <a
              className="w-10 h-10 border border-slate-700 flex items-center justify-center hover:bg-primary transition-colors"
              href="#"
            >
              {"TW"}
            </a>
          </div>
        </div>
        <div>
          <h5 className="font-bold uppercase text-xs tracking-[0.2em] mb-6 text-primary">
            {"Company"}
          </h5>
          <ul className="space-y-4 text-sm text-slate-400">
            <li>
              <Link
                className="hover:text-white"
                href="/"
              >
                {"About Us"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white"
                href="/agents"
              >
                {"Our Agents"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white"
                href="/market-insights"
              >
                {"Market Insights"}
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-white"
                href="/contact-us"
              >
                {"Contact Us"}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold uppercase text-xs tracking-[0.2em] mb-6 text-primary">
            {"Legal"}
          </h5>
          <ul className="space-y-4 text-sm text-slate-400">
            <li>
              <a
                className="hover:text-white"
                href="#"
              >
                {"Privacy Policy"}
              </a>
            </li>
            <li>
              <a
                className="hover:text-white"
                href="#"
              >
                {"Terms of Service"}
              </a>
            </li>
            <li>
              <a
                className="hover:text-white"
                href="#"
              >
                {"Fair Housing"}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between text-[10px] uppercase tracking-widest text-slate-500">
        <p>
          {" 2024 EstateBlue Realty Group. All Rights Reserved."}
        </p>
        <p>
          {"DRE #01928374"}
        </p>
      </div>
    </footer>
  )
}
