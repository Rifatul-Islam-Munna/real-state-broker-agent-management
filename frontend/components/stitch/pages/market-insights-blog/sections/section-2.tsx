/* eslint-disable @next/next/no-img-element */

export function Section2Section() {
  return (
    <main>
      <section className="relative bg-primary py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-transparent">

          </div>
          <img
            alt="Modern office building architecture"
            className="w-full h-full object-cover"
            data-alt="Modern architectural glass building against blue sky"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB89qxif0aNBxfzNGrQuA7oyDYyoPf7vzvB6eXmtR5_Gi4sWIA8ifj23yuoQkUHvfe2X93eCrQGH97vqBnJ_Cz81ERywyGTMQKyfgneaGkjezgwmyjJjxYCNv8Z4-xuxUjNh4ic016tITf-bpn_ALXfCCgw0y8RLGR7yMJd3CACVMByNbM9SukDbX0LwV609TvPItUzLCustIjXxprYPxm5ghVUitQ_gFGGs22WHSa8b-lj2DKAbcdjY83km9nPpcCJzhN_fXZ0i1Y"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center lg:text-left">
          <h1 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
            {" Market Insights & News "}
          </h1>
          <p className="text-lg lg:text-xl text-white/90 max-w-2xl mb-10 font-light leading-relaxed">
            {" Expert analysis and the latest updates on the ever-evolving real estate landscape. Stay ahead with our data-driven reports. "}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <button className="bg-accent text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-accent/90 transition-all">
              {" Explore Trends "}
            </button>
            <button className="border-2 border-white text-white px-8 py-4 font-bold uppercase tracking-widest hover:bg-white hover:text-primary transition-all">
              {" Market Reports "}
            </button>
          </div>
        </div>
      </section>
      <section className="bg-white dark:bg-slate-900 border-b border-primary/10 py-6 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="w-full lg:max-w-md relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50">
                {"search"}
              </span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-slate-800 border border-primary/10 focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm transition-all"
                placeholder="Search articles, neighborhoods, or trends..."
                type="text"
              />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button className="px-4 py-2 bg-primary text-white text-xs font-bold uppercase tracking-tighter">
                {"All Posts"}
              </button>
              <button className="px-4 py-2 bg-background-light dark:bg-slate-800 text-primary dark:text-secondary text-xs font-bold uppercase tracking-tighter hover:bg-primary/10 transition-colors">
                {"Buying Guides"}
              </button>
              <button className="px-4 py-2 bg-background-light dark:bg-slate-800 text-primary dark:text-secondary text-xs font-bold uppercase tracking-tighter hover:bg-primary/10 transition-colors">
                {"Selling Guides"}
              </button>
              <button className="px-4 py-2 bg-background-light dark:bg-slate-800 text-primary dark:text-secondary text-xs font-bold uppercase tracking-tighter hover:bg-primary/10 transition-colors">
                {"Neighborhood Spotlights"}
              </button>
              <button className="px-4 py-2 bg-background-light dark:bg-slate-800 text-primary dark:text-secondary text-xs font-bold uppercase tracking-tighter hover:bg-primary/10 transition-colors">
                {"Market Trends"}
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            <div className="mb-16">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-6">
                {"Featured Insight"}
              </h2>
              <article className="group cursor-pointer">
                <div className="aspect-[16/9] overflow-hidden mb-8 border border-primary/10">
                  <img
                    alt="Luxury modern house interior"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    data-alt="Luxurious modern minimalist living room interior design"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBDIaufi5tPOcR7NtuTGczYva6uhokUbkrr0hLF5RFGvZQQFwIqwBskSuU9rKPRSslcr94HX5ZbrmXQEPyy-5U2ZemPVrPf3M6Hpg5w1K5kQIygZf7cYRf75vbBtg-mai5diUSy0asTM4paJ7wH6clAWSqVK2cGSZNJ6JzuLOA3HOutaNTTJ7Ysa1uxMKKWZyF7N-0kKMMWzZUbclWJ_REXxo7kRcShyOwLUK0DuZ1Q-l_1JWr3Y9zGmuE11NwsbYo8oYDCdaeEspU"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-xs font-bold text-primary/60 uppercase tracking-widest">
                    <span>
                      {"Market Trends"}
                    </span>
                    <span className="w-1 h-1 bg-accent rounded-full">

                    </span>
                    <span>
                      {"Oct 24, 2023"}
                    </span>
                  </div>
                  <h3 className="text-3xl font-bold text-primary group-hover:text-accent transition-colors leading-tight">
                    {" The Shift in Urban Living: Why Suburbs are Making a Huge Comeback in 2024 "}
                  </h3>
                  <p className="text-text-main/70 dark:text-slate-400 leading-relaxed text-lg">
                    {" Recent data suggests a significant pivot in buyer preferences. We explore the driving factors behind the suburban migration and what it means for property valuations in metropolitan hubs... "}
                  </p>
                  <button className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm border-b-2 border-primary pb-1 group-hover:text-accent group-hover:border-accent transition-all">
                    {" Read Full Article "}
                    <span className="material-symbols-outlined text-sm">
                      {"arrow_forward"}
                    </span>
                  </button>
                </div>
              </article>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-accent mb-8">
                {"Recent Articles"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <article className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden mb-6 border border-primary/10">
                    <img
                      alt="Apartment buildings"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      data-alt="Symmetric row of modern apartment buildings under clear sky"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuALAOfSAhHUNj7b3j5t1bP5KN-osFJkWL5zfhwj3fogETpHjC2v2rHD52mVEiazzHx51dHxMyxJ3eeai0aVEoDCpEFe7y7q7if7-0BkteDyfDcAO1V1DodDOF56f8W9UAnymsmGbC5ueFFV-mOe0GLWK7I7jbMrlJL_B2Qo4GRkhlcG057mzyeVbh6L2-Br7o4mkqBsaFMoCGTVcNxjZ2w2YiK0DIP1x948IZWY9vUPC43q-HzF1vz3EuZ_MmCkLpWEBGGWsA5upoU"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      {"Buying Guides"}
                    </span>
                    <h4 className="text-xl font-bold text-primary leading-snug group-hover:text-accent transition-colors">
                      {" First-Time Buyer's Checklist for the Current Market "}
                    </h4>
                    <p className="text-sm text-text-main/70 dark:text-slate-400 line-clamp-2">
                      {" Everything you need to know before putting in your first offer in today's competitive landscape. "}
                    </p>
                  </div>
                </article>
                <article className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden mb-6 border border-primary/10">
                    <img
                      alt="Real estate contract"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      data-alt="Close up of real estate contract with pen and house keys"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6XoG_MMxX-62PfBO4iR8howqM-8rRvmWL6DUdiJ3TRTZhWu4nIppNu8vLcXqScQ-lJPRkD4cst5_exKZcBh0MvyOxmQJfi6Bowd0k6sI0ip--rP8bGkKs_o_yPvngphx46F_3gFpuER5P0ciNjnqKrymYBhiE1F0udrXq_4nlslUhiTA_n_Pw4JJ60ZBjFC6Ea8yXkpxNgpwOoetV58S7MzyOBPghoomZ7o2y4v7tSesquj_VGAdP6czoWNxZuAI1bPgZZ-tC2ZY"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      {"Selling Guides"}
                    </span>
                    <h4 className="text-xl font-bold text-primary leading-snug group-hover:text-accent transition-colors">
                      {" 5 High-ROI Renovations Before Selling Your Home "}
                    </h4>
                    <p className="text-sm text-text-main/70 dark:text-slate-400 line-clamp-2">
                      {" Maximize your property value with these strategic home improvements that buyers love. "}
                    </p>
                  </div>
                </article>
                <article className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden mb-6 border border-primary/10">
                    <img
                      alt="City street view"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      data-alt="Lively city street with pedestrians and urban architecture"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2AH3WadWsmzCT2XxrFNxqOM5dqanBM4BAA5kz86QC5M1Qlgw-lmcd6KGrsRL-7i9nrJ62DKSFjQtFM_qCv67sIzRqVKw_lhS8NKR-CxroKXWaIwzvbLDj-S8uPTH6IzZT8i6Pl5cwxdKjVv9rkDS-fYQ-HhrVUmij0a4XkG7BkcxXyqDYLlV1Yb9yEfAuOPcKzZYYxwzOllwRGyIU79TEYqsyG3JvUAZ2yao4gGmoqsOQnLpmv0Gy7bld169QX5mFJwKYr8jpij0"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      {"Neighborhood Spotlights"}
                    </span>
                    <h4 className="text-xl font-bold text-primary leading-snug group-hover:text-accent transition-colors">
                      {" Spotlight: The Growing Appeal of the East Side District "}
                    </h4>
                    <p className="text-sm text-text-main/70 dark:text-slate-400 line-clamp-2">
                      {" Exploring the local amenities, schools, and vibrant culture of this rising neighborhood. "}
                    </p>
                  </div>
                </article>
                <article className="group cursor-pointer">
                  <div className="aspect-square overflow-hidden mb-6 border border-primary/10">
                    <img
                      alt="Financial data charts"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      data-alt="Business dashboard with colorful financial growth charts"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuR8RVbx6qEBKiUjn3bS7dJ6NyJ02nBSeJZBOHEeaYVMZMgwHJotnn6rK7q3eaU9CRjDP91xdAGV-tNctHSUhlN8AEpLrR5l7niED7MsX289GELMr3g4rQrVxJaNAMVcjY-RvL6YjBD5zRjhIqvpSblzC50wxJkTm8FzN6L2WQB-JPJghmBG9BthsLOasUREuwYKZmW8eU5elll0SZdhoZzZV2nenVfUfhUZCO07OZCXZUEHtl4etncCVMU7TrI5bAjR_PknRCjm0"
                    />
                  </div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      {"Market Trends"}
                    </span>
                    <h4 className="text-xl font-bold text-primary leading-snug group-hover:text-accent transition-colors">
                      {" Interest Rates: How the Federal Changes Impact You "}
                    </h4>
                    <p className="text-sm text-text-main/70 dark:text-slate-400 line-clamp-2">
                      {" A deep dive into the recent rate hikes and their direct effect on mortgage affordability. "}
                    </p>
                  </div>
                </article>
              </div>
              <div className="mt-16 flex justify-center">
                <button className="bg-primary/5 text-primary border border-primary/20 px-10 py-4 font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
                  {" Load More Articles "}
                </button>
              </div>
            </div>
          </div>
          <aside className="lg:col-span-4 space-y-12">
            <div className="bg-white dark:bg-slate-900 border border-primary/10 p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-accent">
                  {"trending_up"}
                </span>
                {" Trending Topics "}
              </h3>
              <div className="space-y-6">
                <a
                  className="block group"
                  href="#"
                >
                  <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                    {"#1 Trend"}
                  </span>
                  <p className="text-sm font-bold text-text-main dark:text-slate-200 group-hover:text-primary transition-colors">
                    {"Sustainable Housing & Eco-Friendly Homes"}
                  </p>
                </a>
                <a
                  className="block group"
                  href="#"
                >
                  <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                    {"#2 Trend"}
                  </span>
                  <p className="text-sm font-bold text-text-main dark:text-slate-200 group-hover:text-primary transition-colors">
                    {"Remote Work's Impact on Luxury Real Estate"}
                  </p>
                </a>
                <a
                  className="block group"
                  href="#"
                >
                  <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                    {"#3 Trend"}
                  </span>
                  <p className="text-sm font-bold text-text-main dark:text-slate-200 group-hover:text-primary transition-colors">
                    {"Commercial to Residential Conversions"}
                  </p>
                </a>
                <a
                  className="block group"
                  href="#"
                >
                  <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                    {"#4 Trend"}
                  </span>
                  <p className="text-sm font-bold text-text-main dark:text-slate-200 group-hover:text-primary transition-colors">
                    {"Smart Home Integration for Resale Value"}
                  </p>
                </a>
              </div>
            </div>
            <div className="bg-primary p-8 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-4">
                  {"Stay in the Loop"}
                </h3>
                <p className="text-sm text-white/80 mb-6 leading-relaxed">
                  {" Get weekly market insights and the latest neighborhood news delivered straight to your inbox. "}
                </p>
                <form className="space-y-3">
                  <input
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 focus:bg-white/20 focus:outline-none placeholder:text-white/50 text-sm"
                    placeholder="Email Address"
                    type="email"
                  />
                  <button
                    className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3 uppercase tracking-widest text-xs transition-colors"
                    type="submit"
                  >
                    {" Subscribe Now "}
                  </button>
                </form>
                <p className="text-[10px] text-white/40 mt-4 text-center">
                  {" No spam. Unsubscribe at any time. "}
                </p>
              </div>
              <span className="material-symbols-outlined absolute -bottom-10 -right-10 text-[120px] text-white/5 rotate-12 select-none">
                {"mail"}
              </span>
            </div>
            <div className="bg-secondary/10 border border-secondary/20 p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">
                {"Looking to Buy?"}
              </h3>
              <p className="text-sm text-text-main/70 mb-6 italic">
                {" \"The best time to buy real estate is always five years ago, but the second best time is now.\" "}
              </p>
              <a
                className="flex items-center justify-between group font-bold text-primary"
                href="#"
              >
                <span>
                  {"View New Listings"}
                </span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                  {"arrow_forward"}
                </span>
              </a>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
