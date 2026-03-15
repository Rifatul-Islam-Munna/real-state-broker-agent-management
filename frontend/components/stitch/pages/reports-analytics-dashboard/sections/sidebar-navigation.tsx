
import { AppIcon } from "@/components/ui/app-icon"

export function SidebarNavigationSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col border-r border-primary">
      <div className="p-6 flex items-center gap-3">
        <div className="size-10 bg-accent rounded-full flex items-center justify-center">
          <AppIcon className="text-white" name="domain" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">
            {"EstatePro"}
          </h1>
          <p className="text-xs text-secondary">
            {"Admin Portal"}
          </p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <a
          className="flex items-center gap-3 px-3 py-3 text-secondary hover:bg-secondary/10 transition-colors"
          href="#"
        >
          <AppIcon name="dashboard" />
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-3 text-secondary hover:bg-secondary/10 transition-colors"
          href="#"
        >
          <AppIcon name="house" />
          <span className="text-sm font-medium">
            {"Listings"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-3 text-secondary hover:bg-secondary/10 transition-colors"
          href="#"
        >
          <AppIcon name="person" />
          <span className="text-sm font-medium">
            {"Agents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-3 text-white bg-secondary/20 border-l-4 border-accent"
          href="#"
        >
          <AppIcon name="analytics" />
          <span className="text-sm font-medium">
            {"Reports"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-3 text-secondary hover:bg-secondary/10 transition-colors"
          href="#"
        >
          <AppIcon name="settings" />
          <span className="text-sm font-medium">
            {"Settings"}
          </span>
        </a>
      </nav>
      <div className="p-6 mt-auto border-t border-secondary/20">
        <div className="flex items-center gap-3">
          <div
            className="size-10 bg-secondary/30 rounded-full bg-cover bg-center"
            data-alt="Admin user profile picture"
            style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAtb0Ii8DVAQsDX4ljLnhDNFN4Tp2iQQ-OZduPkW2TP0MEF6ALQM9hswsUAsVh6_DB2pLmKaYpoeic3CPduDP9pbV5ypouI_qUO3STH1BsHnk0s-zCsCndkwFKTGwOIHzcE2UsoT9Oh6F2aIYxU5-d0uJuRhe0b2lE1XVEPefJiZKcBftyHjzSPoRxOWpSh2EV0SiXkE0aoFUqMjPQocHYg3xjTV5aPgIfGuaFQCEqWy9f-mxxPdbhyBVDPjD9H3I6--cnB__vQqRg')" }}
          >

          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">
              {"Alexander Wright"}
            </p>
            <p className="text-xs text-secondary truncate">
              {"Principal Broker"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
