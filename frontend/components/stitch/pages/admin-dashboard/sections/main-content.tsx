/* eslint-disable @next/next/no-img-element */

export function MainContentSection() {
  return (
    <main className="flex-1 min-h-screen">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
        <div className="flex items-center gap-4 w-96">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {"search"}
            </span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary"
              placeholder="Search leads, deals, or properties..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 relative">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
              {"notifications"}
            </span>
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-accent rounded-full border-2 border-white">

            </span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">
              {"help_outline"}
            </span>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2">

          </div>
          <button className="flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 pr-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
              {"AM"}
            </div>
            <span className="text-sm font-medium">
              {"Account"}
            </span>
          </button>
        </div>
      </header>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {"Good morning, Alex"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {"Here's what's happening in your agency today."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 border-l-4 border-primary rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
              {"Active Listings"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {"142"}
                </h3>
                <p className="text-green-600 text-xs font-bold mt-1">
                  {"+12% from last month"}
                </p>
              </div>
              <span className="material-symbols-outlined text-primary/20 text-4xl">
                {"home"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 border-l-4 border-secondary rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
              {"Leads this Week"}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {"48"}
                </p>
                <p className="text-[10px] text-slate-400 uppercase">
                  {"New"}
                </p>
              </div>
              <div className="text-center border-x border-slate-100 dark:border-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">
                  {"32"}
                </p>
                <p className="text-[10px] text-slate-400 uppercase">
                  {"Cont."}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-accent">
                  {"14"}
                </p>
                <p className="text-[10px] text-slate-400 uppercase">
                  {"Conv."}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 border-l-4 border-accent rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
              {"Deals in Progress"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {"24"}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {"8 closing this month"}
                </p>
              </div>
              <span className="material-symbols-outlined text-accent/20 text-4xl">
                {"contract"}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-6 border-l-4 border-slate-400 rounded-lg">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
              {"Monthly Revenue"}
            </p>
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                  {"$84.2k"}
                </h3>
                <p className="text-green-600 text-xs font-bold mt-1">
                  {"94% of target"}
                </p>
              </div>
              <span className="material-symbols-outlined text-slate-400/20 text-4xl">
                {"payments"}
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Top-Performing Agents"}
              </h2>
              <button className="text-primary text-xs font-bold hover:underline">
                {"View All"}
              </button>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">
                      {"Agent"}
                    </th>
                    <th className="px-6 py-4">
                      {"Status"}
                    </th>
                    <th className="px-6 py-4">
                      {"Deals Closed"}
                    </th>
                    <th className="px-6 py-4">
                      {"Revenue"}
                    </th>
                    <th className="px-6 py-4">
                      {"Growth"}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          <img
                            alt="Sarah"
                            data-alt="Agent headshot portrait"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBx4X0x9H9kwWbDeyzUrfVYppy1U8xi4OfEj0AsGSAKCB63oSdnc8WjyF4ct6RFLe_sKDk5r52S__bg3wkt3wtDxQt4xqyEyFX8qSscjJlvyYhlEuO2MuqJvTPTYHsjGwxZ7V3Zh4jVCOwTUupjsHP5_VqbLNMibnXmX5X4QsWmATzz2rKJiZ1LijPf52yvBfOZYMAq1HdXCZi-NO9yNdGJcmsYl3ee5hekcAyJZVtH4KGyDoYOGanFvXbpolRO4gkc3aLoiWzJ06s"
                          />
                        </div>
                        <span className="text-sm font-bold">
                          {"Sarah Jenkins"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                        {"Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"12"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {"$2.4M"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-[80px]">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: "85%" }}
                        >

                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          <img
                            alt="David"
                            data-alt="Agent headshot portrait"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDul9IB9OprCIm-4AcaKALkV_Wr3PVfHKojbDCj7TfZ-jyDAfu2oMwndx73aVrPUH-FAK9NcPIkO-n2Lnv_Sm0FXhVzoHU4bwHZHtcOiGMPZiK8HrlKdzkDsDoOPKozL9K98LBZSvtCS85vxze1OfawCMIH5zPCXUueY2HSUnXPAo3rYV3tlt-hz9nYAzTZ1Pxtaj1L8f_0_BRkNJwKVyurQXpaPQBNNMg9B00iMt1jgRGNnGPrBWMjFcpetnZfExy4uWWDsKC5b8o"
                          />
                        </div>
                        <span className="text-sm font-bold">
                          {"David Thorne"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                        {"Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"9"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {"$1.8M"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-[80px]">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: "60%" }}
                        >

                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                          <img
                            alt="Emma"
                            data-alt="Agent headshot portrait"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAC0ieFRry1aPmj1X2AAvHevy-8aIr2kMDpd2RBb-IyDTj5SJ7sqcjBPmbRZxaJx9Ub8zYdnhgf4IOFEiXnqWoUcZ5QzZjfBkkOm5_bX80-wQEMNFfGbxv-tZnNoVS3YGDrP-kgzI0FMCBe-T-wAVsVk6cQFp8vKpVvh8hc8QKx4_Iz4yFQG_PulTlixGPlpzIRIHcEkNpnwhjXybHl41O8gs7oLF7UtIYky-H-LAr732XZGqKcPYj3xqK-LkuGLXIUDbJf4wxwh-w"
                          />
                        </div>
                        <span className="text-sm font-bold">
                          {"Emma Wilson"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                        {"Away"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {"7"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-primary">
                      {"$1.1M"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-[80px]">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{ width: "45%" }}
                        >

                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Priority Alerts"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-accent">
                    {"warning"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {"4 Pending Contracts"}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {"Awaiting digital signatures for more than 48 hours."}
                    </p>
                    <button className="mt-2 text-xs font-black text-accent uppercase tracking-tighter hover:underline">
                      {"Review Now"}
                    </button>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-lg">
                  <span className="material-symbols-outlined text-red-500">
                    {"event_busy"}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {"2 Expiring Listings"}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      {"The Oakwood Heights listings will expire in 3 days."}
                    </p>
                    <button className="mt-2 text-xs font-black text-red-500 uppercase tracking-tighter hover:underline">
                      {"Renew Listings"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {"Property Visits"}
              </h2>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">
                {"Today"}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              <div className="p-4 flex gap-4">
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-lg flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                    {"Oct"}
                  </p>
                  <p className="text-lg font-black text-primary leading-none mt-1">
                    {"12"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {"The Grand Penthouse"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {"10:30 AM - 11:30 AM"}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                      {"person"}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {"Mr. & Mrs. Henderson"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 flex gap-4">
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-lg flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                    {"Oct"}
                  </p>
                  <p className="text-lg font-black text-primary leading-none mt-1">
                    {"12"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {"Sunset Ridge Estate"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {"02:00 PM - 03:00 PM"}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                      {"person"}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {"James Miller"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 flex gap-4 opacity-60 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 w-14 h-14 rounded-lg flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                    {"Oct"}
                  </p>
                  <p className="text-lg font-black text-slate-400 leading-none mt-1">
                    {"12"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-500 truncate line-through">
                    {"Suburban Villa"}
                  </p>
                  <p className="text-[10px] font-bold text-red-500 mt-1 uppercase">
                    {"Cancelled"}
                  </p>
                </div>
              </div>
              <div className="p-4 flex gap-4">
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-lg flex-shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">
                    {"Oct"}
                  </p>
                  <p className="text-lg font-black text-primary leading-none mt-1">
                    {"13"}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {"Modern Loft Central"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {"09:00 AM - 10:00 AM"}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="material-symbols-outlined text-[14px] text-slate-400">
                      {"person"}
                    </span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {"Tech Startups Inc."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <button className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
              {" View Full Calendar "}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
