/* eslint-disable @next/next/no-img-element */

export function BlogSection() {
  return (
    <section className="py-20 bg-background-light">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-accent font-bold tracking-widest uppercase text-xs">
            {"Knowledge Base"}
          </span>
          <h2 className="text-4xl font-black text-primary mt-2">
            {"Market Insights & News"}
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <article className="bg-white border border-slate-200 flex flex-col group cursor-pointer">
            <div className="overflow-hidden">
              <img
                alt="Real estate trends"
                className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                data-alt="Market data analysis on a digital tablet"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAecifMl8ran3REdLTZ0cFt0cXCvwJgwHF9SuyMAbcVpBpyGV-k-cKsv96ChZkCV66OS0Y3Aq9XSG48oHykd5VDOB0_la5794oeOST5QU2tJBHU4XhgYvZKOsoaTkKUMVa0-zKPqp3VLTaY80FLssRymoKemZsO4kiqR3eQWnR3arDoZp5I-mcC2ra5Xy_ve-6cMhjkfbShg0AjG3kYPEuyyMU0618_0Pqi3iVKS-ip8RHgFjp2QoCki5V65VdnRWN00TM8TV8VXwk"
              />
            </div>
            <div className="p-8">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                {"Market Analysis"}
              </span>
              <h3 className="text-xl font-bold text-primary mt-4 mb-4 leading-tight group-hover:text-accent transition-colors">
                {"2024 Real Estate Market Forecast: What to Expect"}
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {"Understanding interest rate fluctuations and their impact on luxury residential inventory levels..."}
              </p>
              <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                <span>
                  {"May 12, 2024"}
                </span>
                <span className="text-primary group-hover:underline">
                  {"Read Post"}
                </span>
              </div>
            </div>
          </article>
          <article className="bg-white border border-slate-200 flex flex-col group cursor-pointer">
            <div className="overflow-hidden">
              <img
                alt="Interior design"
                className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                data-alt="Modern minimalist living room interior"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBe2f7rDxZUBQA95Njm_T-2HRYvpyOnBJvm90b5-EGCKfkSaYufIDbHr0v5OQfYhOd6wOSMtGDJ2Vg3NvrJVe9IcHRkLKriGTRkN9GwT9IBcU2HZLbj1WZ0G1JnA4EECk6_U-JWBzGXLnPMe8cEVYJwC5a8BltrGnVhkPZjrfOVQJaRzQWChDMRKhGD47DlTa0OlSIv6JNxdPKTpaXSdL70ApelWSvQWMFqFgOaGo1YrmPrWX8_BY9kL7pO6_GJ5jtCBbq201q9WcY"
              />
            </div>
            <div className="p-8">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                {"Lifestyle"}
              </span>
              <h3 className="text-xl font-bold text-primary mt-4 mb-4 leading-tight group-hover:text-accent transition-colors">
                {"Staging Your Home for a Record-Breaking Sale"}
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {"How professional staging can increase your final closing price by up to 15% in urban markets..."}
              </p>
              <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                <span>
                  {"May 08, 2024"}
                </span>
                <span className="text-primary group-hover:underline">
                  {"Read Post"}
                </span>
              </div>
            </div>
          </article>
          <article className="bg-white border border-slate-200 flex flex-col group cursor-pointer">
            <div className="overflow-hidden">
              <img
                alt="Investing"
                className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-700"
                data-alt="Person signing a real estate contract"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCtEbYyy7j15eUpm5mMakC_dLxmgOtwIb080fFbFu2Dv0b4kzuM1H44uCIFuV_j6a7cyQYBkFBFs1FuAoToymaXJHhuXUy9TImPQar8FwACDn4TDfJy_Uj-4V9w_uOptZ_Aj0qrtWA3V3NVwv2UqYL5rakOFOSTK4uHD7IXGhzAbM073ftkZ1RNmZmVaKUBOQXPZqQ6xVRIK9dTtmuMd8OsSthgqTL3_t0s6Zn8sX1tPac3adkt0tOOazytvV8pzHqx17yDB0QYeAs"
              />
            </div>
            <div className="p-8">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">
                {"Investment"}
              </span>
              <h3 className="text-xl font-bold text-primary mt-4 mb-4 leading-tight group-hover:text-accent transition-colors">
                {"The Rise of Secondary Coastal Properties"}
              </h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                {"Why investors are moving away from traditional hubs and towards emerging beachfront communities..."}
              </p>
              <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                <span>
                  {"April 29, 2024"}
                </span>
                <span className="text-primary group-hover:underline">
                  {"Read Post"}
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
