export function TopNavigationSection() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark px-6 py-3 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3 text-primary">
          <span className="material-symbols-outlined text-3xl font-bold">
            {"domain"}
          </span>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-tight">
            {"AgencyPro"}
          </h2>
        </div>
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5 w-64">
          <span className="material-symbols-outlined text-slate-500 text-xl">
            {"search"}
          </span>
          <input
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-500"
            placeholder="Search deals, clients..."
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">
              {"file_download"}
            </span>
          </button>
          <button className="flex items-center justify-center rounded-xl h-10 w-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary/10 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">
              {"share"}
            </span>
          </button>
        </div>
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
          {" JD "}
        </div>
      </div>
    </header>
  )
}
