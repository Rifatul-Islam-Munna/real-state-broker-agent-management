export function SidebarSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col border-r border-primary/20">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-white rounded-full flex items-center justify-center text-primary">
          <span className="material-symbols-outlined font-bold">
            {"corporate_fare"}
          </span>
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
          <span className="material-symbols-outlined text-xl">
            {"dashboard"}
          </span>
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"domain"}
          </span>
          <span className="text-sm font-medium">
            {"Properties"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"person_search"}
          </span>
          <span className="text-sm font-medium">
            {"Leads"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"description"}
          </span>
          <span className="text-sm font-medium">
            {"Documents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"campaign"}
          </span>
          <span className="text-sm font-medium">
            {"Marketing"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"bar_chart"}
          </span>
          <span className="text-sm font-medium">
            {"Reports"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 rounded bg-white/20"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"settings"}
          </span>
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
