"use client"

import Link from "next/link"
import { useState } from "react"

import { useAdminFlowStore } from "@/stores/admin-flow-store"
import { AppIcon } from "@/components/ui/app-icon"

export function FooterSection() {
  const submitMailInboxItem = useAdminFlowStore((state) => state.submitMailInboxItem)
  const [email, setEmail] = useState("")
  const [joined, setJoined] = useState(false)

  return (
    <footer className="bg-primary pt-20 pb-10 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-8">
              <AppIcon className="text-accent text-3xl" name="domain" />
              <span className="text-2xl font-black tracking-tight uppercase">
                {"EstateBlue"}
              </span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              {"Redefining luxury real estate through transparency, integrity, and market expertise for modern buyers and sellers."}
            </p>
            <div className="flex gap-4">
              <a
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-accent transition-colors"
                href="#"
              >
                <AppIcon className="text-sm" name="share" />
              </a>
              <a
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-accent transition-colors"
                href="#"
              >
                <AppIcon className="text-sm" name="public" />
              </a>
              <a
                className="w-10 h-10 border border-white/20 flex items-center justify-center hover:bg-accent transition-colors"
                href="#"
              >
                <AppIcon className="text-sm" name="mail" />
              </a>
            </div>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Quick Links"}
            </h5>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              <li>
                <Link
                  className="hover:text-white transition-colors"
                  href="/property-search"
                >
                  {"Find a Property"}
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
                  href="/profile/buyer/wishlist"
                >
                  {"Buyer Profile"}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-white transition-colors"
                  href="/admin"
                >
                  {"Agent Portal"}
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-white transition-colors"
                  href="/market-insights"
                >
                  {"Market Insights"}
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
                  href="/contact-us"
                >
                  {"Contact Us"}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Locations"}
            </h5>
            <ul className="space-y-4 text-sm font-medium text-white/70">
              <li>
                <a
                  className="hover:text-white transition-colors"
                  href="#"
                >
                  {"New York City"}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-white transition-colors"
                  href="#"
                >
                  {"Beverly Hills"}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-white transition-colors"
                  href="#"
                >
                  {"Miami Shores"}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-white transition-colors"
                  href="#"
                >
                  {"San Francisco"}
                </a>
              </li>
              <li>
                <a
                  className="hover:text-white transition-colors"
                  href="#"
                >
                  {"London West"}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-black uppercase text-xs tracking-[0.2em] mb-8 text-accent">
              {"Newsletter"}
            </h5>
            <p className="text-sm text-white/60 mb-6">
              {"Receive exclusive listings and market reports monthly."}
            </p>
            <form
              className="flex"
              onSubmit={(event) => {
                event.preventDefault()
                submitMailInboxItem({
                  email,
                  kind: "newsletter",
                  message: "Joined the EstateBlue newsletter from the homepage footer.",
                  name: "",
                  subject: "Newsletter signup",
                })
                setEmail("")
                setJoined(true)
              }}
            >
              <input
                className="w-full bg-white/10 border-none px-4 py-3 text-sm focus:ring-1 focus:ring-accent"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                type="email"
                value={email}
              />
              <button className="bg-accent px-6 py-3 font-bold uppercase text-[10px]" type="submit">
                {"Join"}
              </button>
            </form>
            {joined ? (
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                {"Saved to admin mail inbox"}
              </p>
            ) : null}
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 flex flex-col md:row justify-between items-center gap-6">
          <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
            {" 2026 EstateBlue Realty Group. All rights reserved."}
          </p>
          <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/40">
            <a
              className="hover:text-white"
              href="#"
            >
              {"Privacy Policy"}
            </a>
            <a
              className="hover:text-white"
              href="#"
            >
              {"Terms of Service"}
            </a>
            <a
              className="hover:text-white"
              href="#"
            >
              {"Cookie Settings"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
