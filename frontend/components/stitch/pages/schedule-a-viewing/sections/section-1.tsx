
import { AppIcon } from "@/components/ui/app-icon"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function Section1Section() {
  return (
    <div className="flex items-center justify-center p-4 md:p-8 min-h-screen">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border-2 border-primary/10 rounded-xl overflow-hidden flex flex-col md:flex-row">
        <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r-2 border-primary/10">
          <div className="flex items-center gap-2 mb-8 text-primary">
            <AppIcon className="text-3xl" name="calendar_month" />
            <h1 className="text-2xl font-bold tracking-tight">
              {"Schedule a Viewing"}
            </h1>
          </div>
          <div className="bg-background-light dark:bg-background-dark p-4 rounded-xl flex gap-4 items-center border border-primary/10 mb-8">
            <div
              className="size-20 rounded-lg bg-cover bg-center shrink-0"
              data-alt="Modern minimalist house exterior with glass windows"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBsO2_IwzqZYXzqrLk2hhUaWrua3QYbj_8YD7hOyOHos-MGmBIKtO6mvjSoYBiS6vF7bZNI95Noqa9iS0_ewOSEegWekk-QhCmhLnF5hm8f8H8K4y50cPiwM7om8vbhyZjJf4QTDEhc1oAo5nubwoCVRw3T0N_4hnKvgGOfCumMWGCZYwFsS3e8I0rafjU-QyAl6lksCD2mW45_EQXrCvXBacuPdPkqhK_K9O5xxtDqpoiQyNIpKFwuNGn29EvajemwhJQUF4pI6dg')" }}
            >

            </div>
            <div className="flex flex-col">
              <h2 className="font-bold text-lg text-primary">
                {"Azure Bay Estate"}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {"482 Waterfront Drive, Coastal City, CA"}
              </p>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                  {"Select Date"}
                </h3>
                <div className="flex gap-2">
                  <button className="p-1 hover:bg-primary/10 rounded border border-primary/20 text-primary">
                    <AppIcon className="text-sm" name="chevron_left" />
                  </button>
                  <span className="text-sm font-semibold px-2">
                    {"October 2023"}
                  </span>
                  <button className="p-1 hover:bg-primary/10 rounded border border-primary/20 text-primary">
                    <AppIcon className="text-sm" name="chevron_right" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold">
                <div>
                  {"S"}
                </div>
                <div>
                  {"M"}
                </div>
                <div>
                  {"T"}
                </div>
                <div>
                  {"W"}
                </div>
                <div>
                  {"T"}
                </div>
                <div>
                  {"F"}
                </div>
                <div>
                  {"S"}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1">
                <div className="h-10">

                </div>
                <div className="h-10">

                </div>
                <div className="h-10">

                </div>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"1"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"2"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"3"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"4"}
                </button>
                <button className="h-10 rounded-lg bg-primary text-white font-bold">
                  {"5"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"6"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"7"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"8"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"9"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"10"}
                </button>
                <button className="h-10 rounded-lg border border-primary/5 hover:bg-primary/5 transition-colors">
                  {"11"}
                </button>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">
                {"Select Time"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button className="py-2 text-sm border-2 border-primary/10 rounded-lg hover:border-primary transition-all text-primary font-medium">
                  {"09:00 AM"}
                </button>
                <button className="py-2 text-sm border-2 border-primary bg-primary/10 rounded-lg text-primary font-bold">
                  {"10:30 AM"}
                </button>
                <button className="py-2 text-sm border-2 border-primary/10 rounded-lg hover:border-primary transition-all text-primary font-medium">
                  {"01:00 PM"}
                </button>
                <button className="py-2 text-sm border-2 border-primary/10 rounded-lg hover:border-primary transition-all text-primary font-medium">
                  {"03:30 PM"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 md:p-10 bg-slate-50 dark:bg-slate-800/50">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6">
            {"Your Information"}
          </h3>
          <form className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {"Full Name"}
              </label>
              <div className="relative">
                <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" name="person" />
                <Input
                  className="h-auto w-full border-2 border-primary/10 bg-white py-3 pr-4 pl-10 transition-all dark:bg-slate-900"
                  placeholder="John Doe"
                  type="text"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {"Email Address"}
              </label>
              <div className="relative">
                <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" name="mail" />
                <Input
                  className="h-auto w-full border-2 border-primary/10 bg-white py-3 pr-4 pl-10 transition-all dark:bg-slate-900"
                  placeholder="john@example.com"
                  type="email"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {"Phone Number"}
              </label>
              <div className="relative">
                <AppIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" name="call" />
                <Input
                  className="h-auto w-full border-2 border-primary/10 bg-white py-3 pr-4 pl-10 transition-all dark:bg-slate-900"
                  placeholder="+1 (555) 000-0000"
                  type="tel"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {"Message for the Agent (Optional)"}
              </label>
              <Textarea
                className="w-full resize-none border-2 border-primary/10 bg-white px-4 py-3 transition-all dark:bg-slate-900"
                placeholder="Is parking available during the tour?"
                rows={3}
              />
            </div>
            <div className="pt-4">
              <button
                className="w-full py-4 bg-[#E8943A] hover:bg-[#d6832e] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                type="submit"
              >
                <span>
                  {"Confirm Schedule"}
                </span>
                <AppIcon name="arrow_forward" />
              </button>
              <p className="text-[11px] text-center mt-4 text-slate-400 leading-tight">
                {" By clicking confirm, you agree to our Terms of Service and Privacy Policy. A confirmation email will be sent to your address. "}
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
