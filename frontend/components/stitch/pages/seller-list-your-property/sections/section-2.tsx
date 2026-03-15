/* eslint-disable @next/next/no-img-element */

export function Section2Section() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary/60">
              {"Step 1 of 4"}
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-primary">
              {"Basic Information"}
            </h2>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-accent uppercase">
              {"25% Complete"}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 h-4 border-2 border-slate-900 overflow-hidden">
          <div className="bg-accent h-full w-1/4">

          </div>
        </div>
      </div>
      <div className="mb-10 bg-accent/10 border-2 border-accent p-6 flex gap-4 items-start">
        <span className="material-symbols-outlined text-accent text-3xl">
          {"info"}
        </span>
        <div>
          <p className="font-bold text-slate-900 uppercase text-sm mb-1">
            {"Notice to Sellers"}
          </p>
          <p className="text-sm leading-relaxed">
            {"All property submissions are marked as "}
            <strong className="text-accent uppercase">
              {"Pending"}
            </strong>
            {". Our team will review your listing details and media within 24-48 hours. You will receive an email once your listing is approved and live on the public market."}
          </p>
        </div>
      </div>
      <div className="border-4 border-primary p-8 bg-white dark:bg-slate-900">
        <form
          action="#"
          className="space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Property Address"}
              </label>
              <input
                className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent text-lg font-medium bg-transparent"
                placeholder="e.g. 742 Evergreen Terrace, Springfield"
                type="text"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Property Type"}
              </label>
              <select className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent font-medium bg-transparent">
                <option>
                  {"Single Family Home"}
                </option>
                <option>
                  {"Condo / Apartment"}
                </option>
                <option>
                  {"Townhouse"}
                </option>
                <option>
                  {"Commercial"}
                </option>
                <option>
                  {"Land"}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Asking Price (USD)"}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  {"$"}
                </span>
                <input
                  className="w-full border-2 border-slate-900 p-4 pl-8 focus:ring-0 focus:border-accent font-medium bg-transparent"
                  placeholder="500,000"
                  type="number"
                />
              </div>
            </div>
          </div>
          <hr className="border-t-2 border-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-3">
              <h3 className="text-xl font-black uppercase tracking-tight text-primary">
                {"Property Features"}
              </h3>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Bedrooms"}
              </label>
              <input
                className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent font-medium bg-transparent"
                type="number"
                defaultValue="3"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Bathrooms"}
              </label>
              <input
                className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent font-medium bg-transparent"
                type="number"
                defaultValue="2"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
                {"Square Feet"}
              </label>
              <input
                className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent font-medium bg-transparent"
                placeholder="2400"
                type="number"
              />
            </div>
          </div>
          <hr className="border-t-2 border-slate-200" />
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
              {"Property Description"}
            </label>
            <textarea
              className="w-full border-2 border-slate-900 p-4 focus:ring-0 focus:border-accent font-medium bg-transparent"
              placeholder="Describe the best features of your property, recent renovations, and the neighborhood..."
              rows={5}
            >

            </textarea>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-primary mb-2">
              {"Property Images"}
            </label>
            <div className="border-2 border-dashed border-primary bg-primary/5 p-12 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-5xl text-primary mb-4">
                {"add_a_photo"}
              </span>
              <p className="font-bold text-primary uppercase text-sm">
                {"Drag & Drop Images or Click to Upload"}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {"Maximum 20 images. JPG, PNG supported."}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="aspect-square bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                <img
                  alt="Modern house exterior front view"
                  className="w-full h-full object-cover"
                  data-alt="Modern house exterior front view"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9a4E0JZOEhTkBpLKidKGlR0_4cPqHsaTXfRWN0zGTeypnk2WLPWWDz4Zx_c-U-dFPYuiru7lwqFaYDXS949uEVXLt-dvLW8-tNm4Cew0fL5g21Skv3VatOm39CllqoyNdo2tpZ9xhmPKr4qglXJWBZ0lRFjtv308sW-gaYgKrW6h7-e_Tt0xWeu6nrGk89DJf8sWC22XEObdB0hNw6xuMZrInE1gr8Nrtve0hLr6jXsa90lClUKkg-zOQHTgGgiwHZk5qfDcZG4M"
                />
              </div>
              <div className="aspect-square bg-slate-100 border-2 border-slate-200 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">
                    {"sync"}
                  </span>
                </div>
                <img
                  alt="Modern luxury kitchen interior"
                  className="w-full h-full object-cover"
                  data-alt="Modern luxury kitchen interior"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiVX6C-o13QIXwJf-CW_d2vOtYd3crW5cgPSdO_NMJNoIRRfvjYh0eDMdU1TxYJnFOvE0BzLSSR9AehAK1n4KfPG6LP1ugTWOEGEcJLkU1-1J0WMLGn4BwTjwXoJ-c--EtBazYHFzDDVfYxDrS0mDcnEEulreP-J0nH1jApPwKne16O2h5Oi5HJatLiZV24xkTqbUHHvCOPWMxvmg1YUroApoX7B2FT8xRSAtQ93svZZ3n5HDX9uISoON-f-kmbN61JEWEtCyZNds"
                />
              </div>
              <div className="aspect-square border-2 border-dashed border-slate-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-slate-300">
                  {"add"}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <p className="text-xs font-medium text-slate-500 max-w-sm italic">
              {"By submitting, you agree to our Terms of Service and Privacy Policy regarding property listings."}
            </p>
            <button
              className="w-full md:w-auto bg-accent text-white px-10 py-5 text-lg font-black uppercase tracking-tighter border-2 border-accent hover:bg-white hover:text-accent transition-all"
              type="submit"
            >
              {" Submit for Approval "}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
