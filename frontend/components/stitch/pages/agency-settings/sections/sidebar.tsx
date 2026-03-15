
import { AppIcon } from "@/components/ui/app-icon"

export function SidebarSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col border-r border-primary/20">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-white rounded-full flex items-center justify-center text-primary">
          <AppIcon className="font-bold" name="corporate_fare" />
        </div>
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider">
            {"Agency OS"}
          </h1>
          <p className="text-xs text-secondary-light opacity-80">
            {"Admin Console"}
          </p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="dashboard" />
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="domain" />
          <span className="text-sm font-medium">
            {"Properties"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="person_search" />
          <span className="text-sm font-medium">
            {"Leads"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="description" />
          <span className="text-sm font-medium">
            {"Documents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="campaign" />
          <span className="text-sm font-medium">
            {"Marketing"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="bar_chart" />
          <span className="text-sm font-medium">
            {"Reports"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded bg-white/20"
          href="#"
        >
          <AppIcon className="text-xl" name="settings" />
          <span className="text-sm font-medium">
            {"Settings"}
          </span>
        </a>
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="size-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold uppercase">
            {"JD"}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold truncate">
              {"John Doe"}
            </p>
            <p className="text-[10px] opacity-70 truncate">
              {"Principal Broker"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
