export function Section3Section() {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-10 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-xs">
          <span className="material-symbols-outlined text-lg">
            {"domain"}
          </span>
          <span>
            {"EstateHub 2024"}
          </span>
        </div>
        <div className="flex gap-8">
          <a
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
            href="#"
          >
            {"Privacy Policy"}
          </a>
          <a
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
            href="#"
          >
            {"Help Center"}
          </a>
          <a
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors"
            href="#"
          >
            {"Contact Support"}
          </a>
        </div>
      </div>
    </footer>
  )
}
