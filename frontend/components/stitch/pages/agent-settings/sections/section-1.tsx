import { agentSettingsOverviewCards } from "@/data/page-content"
import { AppIcon } from "@/components/ui/app-icon"

export function Section1Section() {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-5 dark:border-white/10 dark:bg-background-dark md:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
            {"Agent Settings"}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {"Profile, alerts, and work preferences"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            {"Keep the agent profile simple: update contact details, focus area, alert rules, and basic account preferences from one screen."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {agentSettingsOverviewCards.map((card) => (
          <article
            key={card.label}
            className="border border-slate-200 bg-background-light p-5 dark:border-white/10 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {card.label}
              </p>
              <AppIcon className="text-primary" name={card.icon} />
            </div>
            <p className="mt-4 text-3xl font-black text-slate-900 dark:text-white">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {card.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
