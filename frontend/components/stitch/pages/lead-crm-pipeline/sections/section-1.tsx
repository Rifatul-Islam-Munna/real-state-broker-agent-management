/* eslint-disable @next/next/no-img-element */


import { AppIcon } from "@/components/ui/app-icon"

export function Section1Section() {
  return (
    <header className="border-b border-primary/10 bg-white px-4 py-4 dark:bg-background-dark md:px-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex items-center gap-3 text-primary">
            <div className="flex size-10 items-center justify-center border border-primary/20 bg-primary/10">
              <AppIcon name="group" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
                {"LeadPro CRM"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {"Track every buyer and seller from first touch to signed deal."}
              </p>
            </div>
          </div>
          <label className="flex h-11 min-w-0 flex-1 xl:min-w-80">
            <div className="flex w-full flex-1 items-center border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center justify-center pl-3 text-slate-500">
                <AppIcon className="text-sm" name="search" />
              </div>
              <input
                className="form-input w-full border-none bg-transparent text-sm placeholder:text-slate-500 focus:ring-0"
                defaultValue=""
                placeholder="Search leads, properties, or assigned agents..."
              />
            </div>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex h-11 items-center justify-center gap-2 border border-primary bg-primary px-4 text-sm font-bold text-white">
            <AppIcon name="person_add" />
            {"Add Lead"}
          </button>
          <button className="flex h-11 items-center justify-center border border-slate-200 bg-slate-100 px-3 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <AppIcon name="notifications" />
          </button>
          <button className="flex h-11 items-center justify-center border border-slate-200 bg-slate-100 px-3 text-slate-600 transition-colors hover:bg-primary/10 hover:text-primary dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <AppIcon name="settings" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden border border-primary/30 bg-primary/20">
            <img
              alt="User profile avatar of a male real estate agent"
              className="h-full w-full object-cover"
              data-alt="User profile avatar of a male real estate agent"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPNrFVPc-l6GkKBpDQu9Hz9BGpVFwT4ddAmTesNIS1yw_LFwMYA-h4AMc3csUO20WtvDbvslGLdFXY5_eALZBf3_ME2-eIdxy0Nfm7wmX3eb9FUAJnDEJy9PrySlkqBCtyPfm4dzu5VC3egZlABi1JN0Y-NXRMv1sfHUpKAwCy9ZnyxeMMj1h7nJ_d7RSdLZYbiKtAWjm08LREh6oYfaxkMuqSaUiAAZQA72ypORCt9JZgMHY24e5VHcErwDk2smzSShOIyY0BX3A"
            />
          </div>
        </div>
      </div>
    </header>
  )
}
