
import { AppIcon } from "@/components/ui/app-icon"

export function MainContentSection() {
  return (
    <main className="flex-1 p-8">
      <header className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-primary dark:text-white mb-2">
            {"Marketing Tools"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {"Manage and optimize your agency outreach across all channels."}
          </p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors">
            <AppIcon className="text-sm" name="download" />
            {" Export Report "}
          </button>
          <button className="bg-accent text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-colors">
            <AppIcon name="add" />
            {" Create Campaign "}
          </button>
        </div>
      </header>
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {"Email Open Rate"}
            </p>
            <AppIcon className="text-primary" name="mail" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">
              {"24.5%"}
            </p>
            <p className="text-xs font-bold text-green-600 flex items-center">
              <AppIcon className="text-xs" name="arrow_upward" />
              {" 2.1%"}
            </p>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: "24.5%" }}
            >

            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {"SMS CTR"}
            </p>
            <AppIcon className="text-secondary" name="sms" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">
              {"12.8%"}
            </p>
            <p className="text-xs font-bold text-green-600 flex items-center">
              <AppIcon className="text-xs" name="arrow_upward" />
              {" 0.5%"}
            </p>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-secondary h-full rounded-full"
              style={{ width: "12.8%" }}
            >

            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {"Conversions"}
            </p>
            <AppIcon className="text-accent" name="leaderboard" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">
              {"86"}
            </p>
            <p className="text-xs font-bold text-green-600 flex items-center">
              <AppIcon className="text-xs" name="arrow_upward" />
              {" 12%"}
            </p>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full rounded-full"
              style={{ width: "65%" }}
            >

            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {"Social Reach"}
            </p>
            <AppIcon className="text-slate-400" name="share" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">
              {"12.4k"}
            </p>
            <p className="text-xs font-bold text-slate-500">
              {"Stable"}
            </p>
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-slate-400 h-full rounded-full"
              style={{ width: "45%" }}
            >

            </div>
          </div>
        </div>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {"Email Campaigns"}
              </h3>
              <a
                className="text-primary text-sm font-semibold hover:underline"
                href="#"
              >
                {"View All"}
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                      {"Campaign Name"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                      {"Type"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                      {"Status"}
                    </th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">
                      {"Performance"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium">
                      {"Monthly Newsletter - June"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                        {"Newsletter"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                        {"Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ width: "65%" }}
                          >

                          </div>
                        </div>
                        <span className="text-xs font-bold">
                          {"65%"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium">
                      {"Downtown Loft - New Alert"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-secondary/10 text-secondary rounded">
                        {"Alert"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
                        {"Sent"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ width: "88%" }}
                          >

                          </div>
                        </div>
                        <span className="text-xs font-bold">
                          {"88%"}
                        </span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium">
                      {"123 Oak St - Open House"}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-accent/10 text-accent rounded">
                        {"Invitation"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {"Scheduled"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full"
                            style={{ width: "0%" }}
                          >

                          </div>
                        </div>
                        <span className="text-xs font-bold">
                          {"0%"}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {"SMS Quick Status"}
              </h3>
              <button className="text-primary text-sm font-semibold flex items-center gap-1">
                <AppIcon className="text-sm" name="send" />
                {" New SMS "}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-background-light dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <AppIcon className="text-secondary" name="textsms" />
                  <p className="text-sm font-bold">
                    {"Price Drop Alert"}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {"Sent to 425 recipients"}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-bold">
                    {"Success"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {"2h ago"}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-background-light dark:bg-slate-900 border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3 mb-2">
                  <AppIcon className="text-secondary" name="textsms" />
                  <p className="text-sm font-bold">
                    {"Showing Reminder"}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {"Sent to 12 recipients"}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">
                    {"Processing"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {"Now"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
        <div className="space-y-8">
          <section className="bg-primary text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AppIcon name="rocket_launch" />
              <h3 className="text-lg font-bold">
                {"Homepage Boost"}
              </h3>
            </div>
            <p className="text-sm text-white/80 mb-6">
              {"Highlight top-tier properties on the main public portal."}
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <div
                  className="w-12 h-12 bg-cover bg-center rounded"
                  data-alt="Modern house exterior"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDsdmT1qXCSzTFRYl51UuneAoDIuS9PKicfs-wbMfY22IY0OkhrLUC1bRvk03q5xhRkeV1JD_z8BqFxvehhlhvrzSj0qMUtQADcmNsb8I7jKyxDZScMlz0mEwYI0WqUs42xUHxDhjs8Q6NQ5lkDVNh_HGaZcVQvqJqxYGBmZEFMaOb42kEJphk_S7FFCJSVe9vkziLOU25OGzxS4ycA2PQ51S2aeKevaLk7RuNt9j5IOUAmiVGzqGWDcn6Zx6xNDFkiFbYoY1CC1m0')" }}
                >

                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold leading-none">
                    {"Luxury Penthouse"}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {"5th Ave, NY"}
                  </p>
                </div>
                <AppIcon className="text-green-400 text-sm" name="check_circle" />
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/10 rounded-lg">
                <div
                  className="w-12 h-12 bg-cover bg-center rounded"
                  data-alt="Beachfront villa"
                  style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCBfscQzwma7TT6WWH0A-Cp1CcXuaLEeBaj6RfHrrbplAbkzXZ8D5pOgfoGpj1CNvi6RCaEHghlQIABoBsn9XgzHVf_FV6MsyR3DZAHZdBGhMbgo1I8xHAPYf2APFe5Qtr9oCRJlzYPXwYFT2c8JporvCItKnuiRtLPfbaJHA15e5PUXdJ2KZMcKr1sI8T_X_h_JuVQh-zyaS2mnkBHi544t7NtYNMXc5tb4osxvCr664EfuOVDUx4op9iQ--wBAvdsDF-9nZwAJs4')" }}
                >

                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold leading-none">
                    {"Beachside Villa"}
                  </p>
                  <p className="text-[10px] text-white/60">
                    {"Malibu, CA"}
                  </p>
                </div>
                <AppIcon className="text-white/40 text-sm cursor-pointer" name="toggle_off" />
              </div>
            </div>
            <button className="w-full mt-6 py-2 bg-white text-primary font-bold rounded-lg text-sm hover:bg-white/90 transition-colors">
              {" Manage Boost Slots "}
            </button>
          </section>
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold mb-4">
              {"Template Library"}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <AppIcon className="text-slate-400 group-hover:text-primary" name="description" />
                  <div>
                    <p className="text-sm font-medium">
                      {"Welcome Client"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {"Uses: {{client_name}}"}
                    </p>
                  </div>
                </div>
                <AppIcon className="text-slate-300" name="chevron_right" />
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <AppIcon className="text-slate-400 group-hover:text-primary" name="description" />
                  <div>
                    <p className="text-sm font-medium">
                      {"New Property Alert"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {"Uses: {{property_address}}"}
                    </p>
                  </div>
                </div>
                <AppIcon className="text-slate-300" name="chevron_right" />
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-700 rounded-lg hover:border-primary transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <AppIcon className="text-slate-400 group-hover:text-primary" name="description" />
                  <div>
                    <p className="text-sm font-medium">
                      {"Tour Confirmation"}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {"Uses: {{tour_date}}"}
                    </p>
                  </div>
                </div>
                <AppIcon className="text-slate-300" name="chevron_right" />
              </div>
            </div>
            <button className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-primary uppercase tracking-wider">
              {" Browse All Templates "}
            </button>
          </section>
          <section className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold mb-4">
              {"Social Sharing"}
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <button className="size-10 bg-blue-600 rounded flex items-center justify-center text-white hover:opacity-90">
                <AppIcon name="social_leaderboard" />
              </button>
              <button className="size-10 bg-sky-400 rounded flex items-center justify-center text-white hover:opacity-90">
                <AppIcon name="share" />
              </button>
              <button className="size-10 bg-pink-600 rounded flex items-center justify-center text-white hover:opacity-90">
                <AppIcon name="photo_camera" />
              </button>
              <button className="size-10 bg-blue-800 rounded flex items-center justify-center text-white hover:opacity-90">
                <AppIcon name="work" />
              </button>
            </div>
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-tight">
                <span className="font-bold text-accent">
                  {"Auto-Post:"}
                </span>
                {" New listings are automatically shared to Facebook and Instagram. "}
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
