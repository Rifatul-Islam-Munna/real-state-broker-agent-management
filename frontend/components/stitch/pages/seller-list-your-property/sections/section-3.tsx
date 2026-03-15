export function Section3Section() {
  return (
    <footer className="bg-primary text-white py-16 px-6 md:px-16 mt-20">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="col-span-2">
          <div className="flex items-center gap-3 text-accent mb-6">
            <span className="material-symbols-outlined text-4xl">
              {"domain"}
            </span>
            <h2 className="text-3xl font-black uppercase tracking-tighter">
              {"Elite Agency"}
            </h2>
          </div>
          <p className="text-slate-300 max-w-md text-sm leading-loose">
            {" The premium real estate partner for luxury sellers and discerning buyers. Our rigorous approval process ensures only the highest quality listings enter our marketplace. "}
          </p>
        </div>
        <div>
          <h4 className="font-black uppercase tracking-widest text-accent mb-6">
            {"Explore"}
          </h4>
          <ul className="space-y-4 text-sm font-bold uppercase">
            <li>
              <a
                className="hover:text-accent"
                href="#"
              >
                {"Properties"}
              </a>
            </li>
            <li>
              <a
                className="hover:text-accent"
                href="#"
              >
                {"Agents"}
              </a>
            </li>
            <li>
              <a
                className="hover:text-accent"
                href="#"
              >
                {"Locations"}
              </a>
            </li>
            <li>
              <a
                className="hover:text-accent"
                href="#"
              >
                {"Market Reports"}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-black uppercase tracking-widest text-accent mb-6">
            {"Contact"}
          </h4>
          <ul className="space-y-4 text-sm font-bold uppercase">
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent">
                {"call"}
              </span>
              {" 800-ELITE-RE "}
            </li>
            <li className="flex items-center gap-2">
              <span className="material-symbols-outlined text-accent">
                {"mail"}
              </span>
              {" listings@eliteagency.com "}
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/10 text-xs text-slate-400 font-bold uppercase tracking-widest flex justify-between">
        <span>
          {" 2024 Elite Agency International."}
        </span>
        <div className="flex gap-6">
          <a
            className="hover:text-white"
            href="#"
          >
            {"Privacy"}
          </a>
          <a
            className="hover:text-white"
            href="#"
          >
            {"Terms"}
          </a>
        </div>
      </div>
    </footer>
  )
}
