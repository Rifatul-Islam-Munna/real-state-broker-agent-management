"use client"

import { useState } from "react"

import { cn } from "@/lib/utils"
import { AppIcon } from "@/components/ui/app-icon"

type PerformanceMode = "views" | "inquiries"

const topPerformingProperties: Record<
  PerformanceMode,
  Array<{
    title: string
    location: string
    imageAlt: string
    imageSrc: string
    primaryMetricIcon: string
    primaryMetricLabel: string
    secondaryMetricIcon: string
    secondaryMetricLabel: string
  }>
> = {
  views: [
    {
      title: "Azure Heights Villa",
      location: "Malibu, CA",
      imageAlt: "Modern luxury house facade",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDzpEzoITh9-59F-Pnbv1CGSzRJ05M2u6Dc_EEtY3WSII0LFd-Y1kl0NOPcwS3AEP47Qu0JdThZTJFhvUay9WtSj_bV8gKEkGCjUK-ltvqZq-MbKaYi5ZvNTORIshrUu2O_QbADKTiDuKWL4hhSO4_jMDtcFbeV3LOIzeNHmCgzpSIU5NQQDQlQdcX7HFOs1658MgSSFEZFslDSTKGJ8uwTspFMwPrA_LHjKncCmyU1MgrfQlG74JAmk18R1-f_ga0XGI1DO_DHDqI",
      primaryMetricIcon: "visibility",
      primaryMetricLabel: "12.4K",
      secondaryMetricIcon: "chat_bubble",
      secondaryMetricLabel: "342",
    },
    {
      title: "The Foundry Lofts",
      location: "Brooklyn, NY",
      imageAlt: "Contemporary downtown loft interior",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD5jbYVJGZhxh1UT9arU_zgtNzq2Vt2Mz28Z7RU_Yfg6nYlfzw5fNyl3HNI3GMYSFk6Dmt_1xQFL2ZFaDeh_4541ZfRCTgxrnJC5YD3VL8NJIkLNxCzI_yKKEIVy5Wj2E6E9N8O-Pjo9g2W2ltKiRNCU42en5GssSO5QGKoP3m8F6npQVs1_m4wpvGf433uiBVqcEgRLKSvdYaNJfpC7pW83TGeqdOz4D9dfmmrHYqR6ISHSvG3Sai9q5Q09Tbf7zEjE9pKWGO1i9I",
      primaryMetricIcon: "visibility",
      primaryMetricLabel: "9.8K",
      secondaryMetricIcon: "chat_bubble",
      secondaryMetricLabel: "288",
    },
    {
      title: "Oak Creek Estate",
      location: "Austin, TX",
      imageAlt: "Classic suburban family home",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAuFdMsfNfeQWDNZgDFnenBIXqn7acd4dd9PU1seQhOqPA0g3QaMfI1irIAxn-oMLe3qf2u1qmgETDCtWfMVwcFSrNj0eiqh4gKhaxBcvgN3EyKWGvbO6ZuFzaPWUlFL8QMczEi2I3hwozN9nKh5m47ADs6-JM8gY6uz35h8LtHQ5Z2GcjcAu9kYiFQZHu-1A1xe8I9G_Xct0RdJCF0KL3dGo62SKGOMxWWUBo7nkJACoATUIhAlSuFAC2jxakoFAo1XhjACQIzYco",
      primaryMetricIcon: "visibility",
      primaryMetricLabel: "8.2K",
      secondaryMetricIcon: "chat_bubble",
      secondaryMetricLabel: "156",
    },
  ],
  inquiries: [
    {
      title: "Summit Crest Residence",
      location: "Aspen, CO",
      imageAlt: "Luxury mountain home exterior",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDzpEzoITh9-59F-Pnbv1CGSzRJ05M2u6Dc_EEtY3WSII0LFd-Y1kl0NOPcwS3AEP47Qu0JdThZTJFhvUay9WtSj_bV8gKEkGCjUK-ltvqZq-MbKaYi5ZvNTORIshrUu2O_QbADKTiDuKWL4hhSO4_jMDtcFbeV3LOIzeNHmCgzpSIU5NQQDQlQdcX7HFOs1658MgSSFEZFslDSTKGJ8uwTspFMwPrA_LHjKncCmyU1MgrfQlG74JAmk18R1-f_ga0XGI1DO_DHDqI",
      primaryMetricIcon: "chat_bubble",
      primaryMetricLabel: "418",
      secondaryMetricIcon: "visibility",
      secondaryMetricLabel: "11.1K",
    },
    {
      title: "Harborline Penthouse",
      location: "Miami, FL",
      imageAlt: "Modern penthouse living room",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD5jbYVJGZhxh1UT9arU_zgtNzq2Vt2Mz28Z7RU_Yfg6nYlfzw5fNyl3HNI3GMYSFk6Dmt_1xQFL2ZFaDeh_4541ZfRCTgxrnJC5YD3VL8NJIkLNxCzI_yKKEIVy5Wj2E6E9N8O-Pjo9g2W2ltKiRNCU42en5GssSO5QGKoP3m8F6npQVs1_m4wpvGf433uiBVqcEgRLKSvdYaNJfpC7pW83TGeqdOz4D9dfmmrHYqR6ISHSvG3Sai9q5Q09Tbf7zEjE9pKWGO1i9I",
      primaryMetricIcon: "chat_bubble",
      primaryMetricLabel: "366",
      secondaryMetricIcon: "visibility",
      secondaryMetricLabel: "9.4K",
    },
    {
      title: "Willow Park Manor",
      location: "Charlotte, NC",
      imageAlt: "Elegant suburban manor exterior",
      imageSrc:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAuFdMsfNfeQWDNZgDFnenBIXqn7acd4dd9PU1seQhOqPA0g3QaMfI1irIAxn-oMLe3qf2u1qmgETDCtWfMVwcFSrNj0eiqh4gKhaxBcvgN3EyKWGvbO6ZuFzaPWUlFL8QMczEi2I3hwozN9nKh5m47ADs6-JM8gY6uz35h8LtHQ5Z2GcjcAu9kYiFQZHu-1A1xe8I9G_Xct0RdJCF0KL3dGo62SKGOMxWWUBo7nkJACoATUIhAlSuFAC2jxakoFAo1XhjACQIzYco",
      primaryMetricIcon: "chat_bubble",
      primaryMetricLabel: "295",
      secondaryMetricIcon: "visibility",
      secondaryMetricLabel: "8.8K",
    },
  ],
}

export function MainContentSection() {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>("views")
  const featuredProperties = topPerformingProperties[performanceMode]

  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="h-20 bg-surface-light dark:bg-slate-900 border-b border-border-color dark:border-slate-800 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">
            {"Reports & Analytics"}
          </h2>
          <div className="h-6 w-px bg-border-color mx-2">

          </div>
          <div className="flex items-center gap-2 border border-border-color px-3 py-1.5 cursor-pointer hover:bg-slate-50">
            <AppIcon className="text-sm" name="calendar_today" />
            <span className="text-sm font-medium">
              {"Last 30 Days"}
            </span>
            <AppIcon className="text-sm" name="expand_more" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-accent text-white px-4 py-2 text-sm font-bold flex items-center gap-2">
            <AppIcon className="text-sm" name="picture_as_pdf" />
            {" Export PDF Report "}
          </button>
          <button className="bg-accent text-white px-4 py-2 text-sm font-bold flex items-center gap-2">
            <AppIcon className="text-sm" name="table_view" />
            {" Export Excel Data "}
          </button>
        </div>
      </header>
      <div className="p-8 overflow-y-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {"Total Revenue"}
            </p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-primary">
                {"$4,250,000"}
              </h3>
              <span className="text-green-600 text-sm font-bold flex items-center">
                <AppIcon className="text-sm" name="arrow_upward" />
                {" 12.5% "}
              </span>
            </div>
          </div>
          <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {"Deals Closed"}
            </p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-primary">
                {"48"}
              </h3>
              <span className="text-green-600 text-sm font-bold flex items-center">
                <AppIcon className="text-sm" name="arrow_upward" />
                {" 8.2% "}
              </span>
            </div>
          </div>
          <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {"Avg Deal Value"}
            </p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-primary">
                {"$88,541"}
              </h3>
              <span className="text-red-500 text-sm font-bold flex items-center">
                <AppIcon className="text-sm" name="arrow_downward" />
                {" 2.1% "}
              </span>
            </div>
          </div>
          <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              {"Lead Conv. Rate"}
            </p>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-3xl font-bold text-primary">
                {"12.4%"}
              </h3>
              <span className="text-green-600 text-sm font-bold flex items-center">
                <AppIcon className="text-sm" name="arrow_upward" />
                {" 1.5% "}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold">
              {"Sales Performance (Revenue Trends)"}
            </h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="size-3 bg-primary">

                </div>
                <span className="text-xs font-medium">
                  {"Residential"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 bg-secondary">

                </div>
                <span className="text-xs font-medium">
                  {"Commercial"}
                </span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end gap-2 w-full border-b border-slate-200">
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[20%]">

              </div>
              <div className="w-full bg-primary h-[40%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[25%]">

              </div>
              <div className="w-full bg-primary h-[45%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[30%]">

              </div>
              <div className="w-full bg-primary h-[55%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[22%]">

              </div>
              <div className="w-full bg-primary h-[38%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[40%]">

              </div>
              <div className="w-full bg-primary h-[65%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[35%]">

              </div>
              <div className="w-full bg-primary h-[75%]">

              </div>
            </div>
            <div className="flex-1 flex flex-col justify-end h-full gap-1">
              <div className="w-full bg-secondary/30 h-[45%]">

              </div>
              <div className="w-full bg-primary h-[85%]">

              </div>
            </div>
          </div>
          <div className="flex justify-between mt-4">
            <span className="text-xs text-slate-500 font-medium">
              {"Week 1"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {"Week 2"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {"Week 3"}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {"Week 4"}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800">
            <div className="p-6 border-b border-border-color">
              <h3 className="text-lg font-bold">
                {"Agent Performance"}
              </h3>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-6 py-4">
                    {"Agent Name"}
                  </th>
                  <th className="px-6 py-4 text-center">
                    {"Listings"}
                  </th>
                  <th className="px-6 py-4 text-center">
                    {"Closed"}
                  </th>
                  <th className="px-6 py-4 text-center">
                    {"Conv. Rate"}
                  </th>
                  <th className="px-6 py-4 text-right">
                    {"Contribution"}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border-color">
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div
                      className="size-8 bg-slate-200 rounded-full"
                      data-alt="Agent headshot avatar"
                    >

                    </div>
                    {" Sarah Jenkins "}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"24"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"12"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"15.2%"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary">
                    {"$1.2M"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div
                      className="size-8 bg-slate-200 rounded-full"
                      data-alt="Agent headshot avatar"
                    >

                    </div>
                    {" David Miller "}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"18"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"9"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"12.5%"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary">
                    {"$850K"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div
                      className="size-8 bg-slate-200 rounded-full"
                      data-alt="Agent headshot avatar"
                    >

                    </div>
                    {" Linda Thompson "}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"21"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"7"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"10.8%"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary">
                    {"$720K"}
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-3">
                    <div
                      className="size-8 bg-slate-200 rounded-full"
                      data-alt="Agent headshot avatar"
                    >

                    </div>
                    {" Robert Chen "}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"15"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"6"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {"11.4%"}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary">
                    {"$680K"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold mb-6">
              {"Lead Source Distribution"}
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>
                    {"Website"}
                  </span>
                  <span>
                    {"45%"}
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100">
                  <div
                    className="h-full bg-primary"
                    style={{ width: "45%" }}
                  >

                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>
                    {"Social Media"}
                  </span>
                  <span>
                    {"25%"}
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: "25%" }}
                  >

                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>
                    {"Referrals"}
                  </span>
                  <span>
                    {"18%"}
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100">
                  <div
                    className="h-full bg-accent"
                    style={{ width: "18%" }}
                  >

                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold uppercase mb-2">
                  <span>
                    {"Direct Mail"}
                  </span>
                  <span>
                    {"12%"}
                  </span>
                </div>
                <div className="h-4 w-full bg-slate-100">
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: "12%" }}
                  >

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-surface-light dark:bg-slate-900 border border-border-color dark:border-slate-800">
          <div className="p-6 border-b border-border-color flex items-center justify-between">
            <h3 className="text-lg font-bold">
              {"Top Performing Properties"}
            </h3>
            <div className="flex gap-2">
              <button
                aria-pressed={performanceMode === "views"}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase transition-colors",
                  performanceMode === "views"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                )}
                onClick={() => setPerformanceMode("views")}
                type="button"
              >
                {"By Views"}
              </button>
              <button
                aria-pressed={performanceMode === "inquiries"}
                className={cn(
                  "px-3 py-1 text-xs font-bold uppercase transition-colors",
                  performanceMode === "inquiries"
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                )}
                onClick={() => setPerformanceMode("inquiries")}
                type="button"
              >
                {"By Inquiries"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-x divide-border-color">
            {featuredProperties.map((property) => (
              <div key={property.title} className="p-6 flex gap-4">
                <div
                  className="size-20 bg-slate-200 flex-shrink-0 bg-cover bg-center"
                  data-alt={property.imageAlt}
                  style={{ backgroundImage: `url('${property.imageSrc}')` }}
                >

                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">
                    {property.title}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {property.location}
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <AppIcon className="text-sm" name={property.primaryMetricIcon} />
                      {` ${property.primaryMetricLabel} `}
                    </span>
                    <span className="text-xs font-bold flex items-center gap-1">
                      <AppIcon className="text-sm" name={property.secondaryMetricIcon} />
                      {` ${property.secondaryMetricLabel} `}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
