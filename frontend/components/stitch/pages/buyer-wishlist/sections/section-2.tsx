/* eslint-disable @next/next/no-img-element */


import { AppIcon } from "@/components/ui/app-icon"

export function Section2Section() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {"Saved Properties"}
          </h1>
          <p className="text-slate-500 mt-1 uppercase text-xs font-bold tracking-widest">
            {"Personal Wishlist 12 Items Total"}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 font-bold text-xs uppercase hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            {" Sort by: Newest "}
          </button>
          <button className="px-4 py-2 bg-primary text-white font-bold text-xs uppercase hover:opacity-90 transition-opacity">
            {" Share List "}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
              <div
                className="relative h-56 bg-slate-100"
                data-alt="Modern luxury condo exterior with large windows"
              >
                <img
                  alt=""
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMqy1Fg8DtPMQ3Eumuk-BuHWJK0XXl8qUJYw8oYDhizmG3HG1UAIMSD0Hnwr3nG8tRfDw5T6Ol-6KQMGjpCcdo25kVb94dSCpppdnqcHw838twEiCqPhiy7KdLalUoSKT-LdAQMIGVoMcoJpdVlOe6WN-i7WSoOgINn8ETDduVt3Fe-Z_r80vh7ZWWvZGVhA_10FPB6AlRLRO4UBFXmgqHnWLnWFg3gDJwyp4-4sSwyBG_zLd4cjLN_kCdYIKH7CATMWU8sEFwbMw"
                />
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-accent text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {"New Listing"}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl">
                    {"$1,240,000"}
                  </h3>
                  <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                    <AppIcon className="text-sm" name="location_on" />
                    {" SEATTLE, WA "}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-4">
                  {"Modern Waterfront Loft with Panoramic City Views"}
                </p>
                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bed" />
                    <span className="text-xs font-bold">
                      {"3 BD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bathtub" />
                    <span className="text-xs font-bold">
                      {"2.5 BA"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="square_foot" />
                    <span className="text-xs font-bold">
                      {"2,100 SF"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-t-2 border-slate-200 dark:border-slate-800">
                <button className="py-3 border-r-2 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="delete" />
                  {" Remove "}
                </button>
                <button className="py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="mail" />
                  {" Contact Agent "}
                </button>
              </div>
            </div>
            <div className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
              <div
                className="relative h-56 bg-slate-100"
                data-alt="Traditional suburban family home with front lawn"
              >
                <img
                  alt=""
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-CO6uLsXGLEIGhKfoXbktSa3L1Sq4jnWRaLNZo4UeKF5uTX1XxzbAbfs04z5Ubat3T8KBhAbQfFxhJ178HQPbRstTU4T0fNlY_4SiYN9EmSoDIRNNGiUbc4s-ivK9UnhZsAUw08ae9mD3H8Cq8IGW3gbakotMgX2RxQLDqxuTuYlDOZzy5kL2OfrZuSCG5o1hJL25oG_8DS7_j14hDyXivhKn2dL5Ort6oUXSaZhC8C-NrGUU2tOCI_zGKXv6dfsfq8H_6s1OmkA"
                />
                <div className="absolute top-0 right-0 p-3">
                  <span className="bg-red-600 text-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest">
                    {"Price Drop"}
                  </span>
                </div>
              </div>
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl">
                    {"$875,000"}
                  </h3>
                  <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                    <AppIcon className="text-sm" name="location_on" />
                    {" AUSTIN, TX "}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-4">
                  {"Craftsman Family Home in Quiet Cul-de-sac"}
                </p>
                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bed" />
                    <span className="text-xs font-bold">
                      {"4 BD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bathtub" />
                    <span className="text-xs font-bold">
                      {"3 BA"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="square_foot" />
                    <span className="text-xs font-bold">
                      {"3,250 SF"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-t-2 border-slate-200 dark:border-slate-800">
                <button className="py-3 border-r-2 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="delete" />
                  {" Remove "}
                </button>
                <button className="py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="mail" />
                  {" Contact Agent "}
                </button>
              </div>
            </div>
            <div className="border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
              <div
                className="relative h-56 bg-slate-100"
                data-alt="Rustic cabin in a snowy mountain forest"
              >
                <img
                  alt=""
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBn8o_PDM6t_vpO41jxowtk0nD7AuMwJyCbMswRiBXTBMjCQ_g5OTAC2ZA2Z98ulJlSKA2Ng9nktzv5x5O2PYTkkn6AvB7trEY3a_LSPP2gXM7GnetSMVoA-l1yEzIQ-eLTZM-4zje1JqWhCzgO0aadO3cG535W8TUyS-mQbuKGOf5508ecMkvedkayX9LKTd5AjykGiNpmqdneCESF04H93ICFj8qMR2-do8GOBbTa5oSTo8jr4DTUMVmoJtOq50CUk_eeE6GE9FY"
                />
              </div>
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl">
                    {"$520,000"}
                  </h3>
                  <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                    <AppIcon className="text-sm" name="location_on" />
                    {" DENVER, CO "}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-4">
                  {"Mountain Retreat with Custom Log Work"}
                </p>
                <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-4 mb-4">
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bed" />
                    <span className="text-xs font-bold">
                      {"2 BD"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="bathtub" />
                    <span className="text-xs font-bold">
                      {"2 BA"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AppIcon className="text-sm text-slate-400" name="square_foot" />
                    <span className="text-xs font-bold">
                      {"1,400 SF"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 border-t-2 border-slate-200 dark:border-slate-800">
                <button className="py-3 border-r-2 border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="delete" />
                  {" Remove "}
                </button>
                <button className="py-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  <AppIcon className="text-sm" name="mail" />
                  {" Contact Agent "}
                </button>
              </div>
            </div>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center p-8 group cursor-pointer">
              <div className="w-16 h-16 border-2 border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:border-primary group-hover:text-primary transition-colors">
                <AppIcon className="text-3xl" name="add" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-widest">
                {"Add Property"}
              </h4>
              <p className="text-slate-500 text-xs mt-1">
                {"Paste a URL or search listings"}
              </p>
            </div>
          </div>
        </div>
        <aside className="flex flex-col gap-8">
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <AppIcon className="text-accent" name="trending_down" />
              <h2 className="font-bold text-sm uppercase tracking-widest">
                {"Price Alerts"}
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex gap-4 group cursor-pointer">
                <div
                  className="w-14 h-14 bg-slate-100 flex-shrink-0"
                  data-alt="Thumbnail of an apartment complex"
                >
                  <img
                    alt=""
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCCzFY0NsHJEmE--KR-4XfbFkir5iGYJbET2yfnm4kbHUmiLPggis9WocWvnkV45CRKi6aM8onbUWtr5vD5Y8YT3g7Ty8Pr-c2o_vo8f6Y_dnKnYIRZq4IT3Y8aDtyoJaLJejHzUWIdf4VmvpWVz55leOJpUBOyf5kpnH9DogD5oUyGbwCYZP0VjUFg4-xB5iuyH7CkpGv08-8juDbo7csqgG1t8S5UKuZsEK0t1xre6v_Wzl8dGfEQVZ5tAbC8ZvrV6xIWTX1c02I"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-tight">
                    {"Down $15,000"}
                  </p>
                  <p className="text-xs font-bold truncate w-32">
                    {"Azure Apartments"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {"Today at 10:15 AM"}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 group cursor-pointer">
                <div
                  className="w-14 h-14 bg-slate-100 flex-shrink-0"
                  data-alt="Thumbnail of a penthouse unit"
                >
                  <img
                    alt=""
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSSDEoXLrjsDgyMLPpJCG77NnRhmMLVDx3mgw9RYHg8rezJ7VQHNPoz6t4H4bBtXjNoznBVU7vAmb1F56qvF3V7ww70FreET5S_9LB1UCnFDhAsjctkaYdTqAPPUitKzVBIkISfP8WbZK96q3Exw2CEZtfO9Yj0Js4averTS2pdw8qszn9gRRoSHPgpb9qFBmzCJ3HzGuLAeoU_DKiEeLMX91j61DFdZwtdQBOnUSDUJDx1Ccd3OW8QOoy65aTK4VPSe5KHQmYQVQ"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-accent font-bold uppercase tracking-tight">
                    {"Down $40,000"}
                  </p>
                  <p className="text-xs font-bold truncate w-32">
                    {"Midtown Penthouse"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {"Yesterday"}
                  </p>
                </div>
              </div>
            </div>
            <button className="w-full mt-6 py-2 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              {" View All Alerts "}
            </button>
          </div>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <AppIcon className="text-primary" name="auto_awesome" />
              <h2 className="font-bold text-sm uppercase tracking-widest">
                {"New Matches"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-6 italic leading-relaxed">
              {"Based on your \"Downtown Loft\" search filters."}
            </p>
            <div className="space-y-4">
              <div className="p-3 border border-slate-100 dark:border-slate-800 hover:border-primary transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold">
                    {"$945k"}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 font-bold uppercase">
                    {"94% Match"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  {"Harbor District 2 BD, 2 BA"}
                </p>
              </div>
              <div className="p-3 border border-slate-100 dark:border-slate-800 hover:border-primary transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold">
                    {"$1.1M"}
                  </span>
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 font-bold uppercase">
                    {"88% Match"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400">
                  {"The Heights 3 BD, 3 BA"}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-primary p-6 text-white">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-70">
              {"Saved Search Summary"}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-xs">
                  {"Saved Homes"}
                </span>
                <span className="text-xs font-bold">
                  {"12"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs">
                  {"Agents Contacted"}
                </span>
                <span className="text-xs font-bold">
                  {"3"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs">
                  {"Viewed Listings"}
                </span>
                <span className="text-xs font-bold">
                  {"148"}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
