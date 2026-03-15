export function SidebarNavigationSection() {
  return (
    <aside className="w-64 border-r border-primary/20 bg-white dark:bg-slate-900 flex flex-col">
      <div className="p-6 border-b border-primary/10">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
          <span className="material-symbols-outlined">
            {"domain"}
          </span>
          {" Elite Realty "}
        </h1>
        <p className="text-xs text-secondary font-semibold uppercase mt-1">
          {"Admin Portal"}
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <a
          className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-colors"
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
          className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"real_estate_agent"}
          </span>
          <span className="text-sm font-medium">
            {"Properties"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-colors"
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
          className="flex items-center gap-3 px-3 py-2.5 bg-primary text-white transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"group"}
          </span>
          <span className="text-sm font-medium">
            {"Teams & Agents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined text-xl">
            {"analytics"}
          </span>
          <span className="text-sm font-medium">
            {"Reports"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-primary/5 transition-colors"
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
      <div className="p-4 border-t border-primary/10">
        <button className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 font-bold text-sm uppercase tracking-wide">
          <span className="material-symbols-outlined text-sm">
            {"person_add"}
          </span>
          {" Add New Agent "}
        </button>
      </div>
    </aside>
  )
}
