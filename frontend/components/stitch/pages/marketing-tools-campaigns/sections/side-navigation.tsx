export function SideNavigationSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col fixed h-full z-10">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-white">
            {"apartment"}
          </span>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">
            {"ProReal"}
          </h1>
          <p className="text-xs text-white/70">
            {"Admin Portal"}
          </p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1">
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"dashboard"}
          </span>
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"house"}
          </span>
          <span className="text-sm font-medium">
            {"Listings"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/20"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"campaign"}
          </span>
          <span className="text-sm font-medium">
            {"Marketing"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"group"}
          </span>
          <span className="text-sm font-medium">
            {"CRM"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"calendar_month"}
          </span>
          <span className="text-sm font-medium">
            {"Calendar"}
          </span>
        </a>
        <div className="pt-4 pb-2 px-4 text-xs font-bold uppercase text-white/40 tracking-wider">
          {"Resources"}
        </div>
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"auto_stories"}
          </span>
          <span className="text-sm font-medium">
            {"Template Library"}
          </span>
        </a>
      </nav>
      <div className="p-4 mt-auto border-t border-white/10">
        <a
          className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
          href="#"
        >
          <span className="material-symbols-outlined">
            {"settings"}
          </span>
          <span className="text-sm font-medium">
            {"Settings"}
          </span>
        </a>
      </div>
    </aside>
  )
}
