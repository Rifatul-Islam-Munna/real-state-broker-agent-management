/* eslint-disable @next/next/no-img-element */


import { AppIcon } from "@/components/ui/app-icon"

export function SidebarSection() {
  return (
    <aside className="w-64 bg-primary text-white flex flex-col fixed inset-y-0 left-0 z-50">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-accent rounded-lg p-2 flex items-center justify-center">
          <AppIcon className="text-white" name="corporate_fare" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none">
            {"AgencyPortal"}
          </h1>
          <p className="text-secondary text-xs mt-1">
            {"Management Admin"}
          </p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-4">
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10 text-white group"
          href="#"
        >
          <AppIcon className="text-xl" name="dashboard" />
          <span className="text-sm font-medium">
            {"Dashboard"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="home_work" />
          <span className="text-sm font-medium">
            {"Properties"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="group" />
          <span className="text-sm font-medium">
            {"Leads"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="person" />
          <span className="text-sm font-medium">
            {"Clients"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="handshake" />
          <span className="text-sm font-medium">
            {"Deals"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="badge" />
          <span className="text-sm font-medium">
            {"Agents"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="calendar_month" />
          <span className="text-sm font-medium">
            {"Calendar"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="campaign" />
          <span className="text-sm font-medium">
            {"Marketing"}
          </span>
        </a>
        <a
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
          href="#"
        >
          <AppIcon className="text-xl" name="bar_chart" />
          <span className="text-sm font-medium">
            {"Reports"}
          </span>
        </a>
        <div className="pt-4 mt-4 border-t border-white/10">
          <a
            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-white/80 hover:text-white transition-colors"
            href="#"
          >
            <AppIcon className="text-xl" name="settings" />
            <span className="text-sm font-medium">
              {"Settings"}
            </span>
          </a>
        </div>
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-secondary overflow-hidden">
            <img
              alt="Admin Avatar"
              data-alt="Portrait of an administrator avatar"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7u_v_a5FYn_UI-PRXsqHI8YGFv4DZm9zCvtcpxThcULhKwCDIOR1zWWXYlJWEXraoWO42hVh2bfLrxc-eNgbiH3poxWS4bzOcyhjTdAMRPR8EKr-h_WjU9NSrWC_3hOEhRMJOq9P7Lt28M4JHs2tDBrgNlxQoKeOXUONpQ9iNJlKuVVimi6xHiSBzkDRTMqJMCy7_DrAe7TGBq-1x2uRJFzDQC_FUAbKpeYtrVAnG6QFwHggtIaN0D0bZ4az35U5T6FEMudbQ89I"
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate">
              {"Alex Morgan"}
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
