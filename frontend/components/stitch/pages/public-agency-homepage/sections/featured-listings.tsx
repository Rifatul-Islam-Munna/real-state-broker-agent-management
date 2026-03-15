/* eslint-disable @next/next/no-img-element */

import Link from "next/link"

import { publicPropertyDetailPageMeta } from "@/static-data/pages/public-property-detail/meta"

const featuredListings = [
  {
    badge: "Featured",
    title: "The Glass Pavilion",
    location: "Beverly Hills, CA 90210",
    price: "$4,250,000",
    imageAlt: "Modern luxury villa",
    imageDataAlt: "Modern luxury white villa with swimming pool",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCo59yKfqt3My2aq9E1EKbCsex113W2YDcWVDq6ZUcWTtChoBEBn9WY3VA2f81ve-WuFEkzfA2z5gnq-J8LanBPWcD6d1Vn_LZej6ugMnlMF6kvrQvRPRn4UJjBLNI5Z195sEiY8Sigxf5n0xRjmiehljcB99JshFQvqeVgA7eF6MnO_5TFj-Ra-ftDktiR4NRiRnwBXCloxy4io8osXTy6i_dskRFb0_ZwoK3_OxSzoHIYgcS-mbfY7ci4hVBubw2my_oAD26k8To",
    specs: ["5 Beds", "4 Baths", "4,500 sqft"],
  },
  {
    badge: "New Arrival",
    title: "Skyline Heights Penthouse",
    location: "Tribeca, NY 10013",
    price: "$1,850,000",
    imageAlt: "Urban penthouse",
    imageDataAlt: "Modern urban penthouse interior with large windows",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAKc-5QKyLhQ5AonzjRwMNww9jblLt1Svw8iv_WthTCANxvqvCb2wdpt0YXKxhNHhuf_TbR9eVudbaO4B2gmO-ccnPh0z57D4Y0bGa82mjGQ4x_Bq41nLmOuaA6FYaxZhjS3D2nOHpSqVRaig_25cGqHZcFUX4FEEFjR3IJ3z2wVlY-WLHK2Ze7rWrvdDWsUFyjL-P-2J7i6ow6NOV7NJgbsElKgL6rylfTmsTXIbDyoySi5qvKkuMFah9D8PsllJYZ15dhIH1YsZs",
    specs: ["3 Beds", "2 Baths", "2,100 sqft"],
  },
  {
    badge: "Hot Offer",
    title: "Azure Cove Estate",
    location: "Malibu, CA 90265",
    price: "$2,100,000",
    imageAlt: "Coastal retreat",
    imageDataAlt: "Coastal luxury retreat with ocean views",
    imageSrc:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCOMAzQcHQiFNlb8MDXI4VzqCjdWt74_en9YG0KVRBBH7J6AfBRYWWzZ0yHxwdT0uu4s69FL_wgJWoKcXqHcEzA6aE4HMpp0_cx2SzQX3018lEl4wrZsyWIqzGTiDii6CIYlWz6H3rw1IWZzdCuwRtk2Pi_ckulqd49bFc9BOuLmEB4urrqDsdGkTsunmpVLTnLjXo1qiQgt2LWM2lUwJLC_9BY-_WuNY0mbkbuBk9y5gJ4XOuqcdRmU2nKOoaBoMjbPX9blVmGEa4",
    specs: ["4 Beds", "3 Baths", "3,200 sqft"],
  },
] as const

const specIcons = ["bed", "bathtub", "square_foot"] as const

export function FeaturedListingsSection() {
  return (
    <section className="py-20 bg-background-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-accent font-bold tracking-widest uppercase text-xs">
              {"Exclusives"}
            </span>
            <h2 className="text-4xl font-black text-primary mt-2">
              {"Featured Listings"}
            </h2>
          </div>
          <div className="flex gap-2">
            <button className="p-3 border border-slate-300 hover:bg-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined">
                {"arrow_back"}
              </span>
            </button>
            <button className="p-3 border border-slate-300 hover:bg-primary hover:text-white transition-colors">
              <span className="material-symbols-outlined">
                {"arrow_forward"}
              </span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {featuredListings.map((listing) => (
            <article
              key={listing.title}
              className="bg-white border border-slate-200 overflow-hidden group"
            >
              <Link href={publicPropertyDetailPageMeta.routePath} className="block">
                <div className="relative h-64 overflow-hidden">
                  <img
                    alt={listing.imageAlt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    data-alt={listing.imageDataAlt}
                    src={listing.imageSrc}
                  />
                  <span className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold uppercase px-3 py-1">
                    {listing.badge}
                  </span>
                  <span className="absolute bottom-4 left-4 bg-white/90 text-primary text-lg font-black px-4 py-2">
                    {listing.price}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    {listing.title}
                  </h3>
                  <p className="text-slate-500 text-sm flex items-center gap-1 mb-6">
                    <span className="material-symbols-outlined text-sm">
                      {"location_on"}
                    </span>
                    {` ${listing.location} `}
                  </p>
                  <div className="flex justify-between py-4 border-t border-slate-100">
                    {listing.specs.map((spec, index) => (
                      <div key={spec} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400">
                          {specIcons[index] ?? "square_foot"}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {spec}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
