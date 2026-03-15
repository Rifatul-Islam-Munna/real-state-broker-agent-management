
import { AppIcon } from "@/components/ui/app-icon"

export function SidebarSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
          <AppIcon className="text-accent" name="apartment" />
          {" AGENCY PORTAL "}
        </h1>
        <p className="text-xs text-secondary mt-1 font-medium uppercase tracking-wider">
          {"Real Estate Management"}
        </p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/20 transition-colors"
          href="#"
        >
          <AppIcon name="dashboard" />
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/20 transition-colors"
          href="#"
        >
          <AppIcon name="home_work" />
          <span className="text-sm font-medium">
            {"Properties"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/20 transition-colors"
          href="#"
        >
          <AppIcon name="group" />
          <span className="text-sm font-medium">
            {"Leads"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/30 transition-colors"
          href="#"
        >
          <AppIcon name="description" />
          <span className="text-sm font-medium">
            {"Documents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/20 transition-colors"
          href="#"
        >
          <AppIcon name="campaign" />
          <span className="text-sm font-medium">
            {"Marketing"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/20 transition-colors"
          href="#"
        >
          <AppIcon name="settings" />
          <span className="text-sm font-medium">
            {"Settings"}
          </span>
        </a>
      </nav>
      <div className="p-4 mt-auto">
        <div className="bg-secondary/20 p-4 rounded-xl">
          <p className="text-xs font-bold text-secondary uppercase mb-2">
            {"Storage Usage"}
          </p>
          <div className="w-full bg-primary h-2 rounded-full mb-2">
            <div className="bg-accent h-2 rounded-full w-[65%]">

            </div>
          </div>
          <p className="text-[10px] text-slate-300">
            {"12.4 GB of 20 GB used"}
          </p>
        </div>
      </div>
    </aside>
  )
}
