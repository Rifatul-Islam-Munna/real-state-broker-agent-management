import { Section1Section } from "./sections/section-1"
import { Section2Section } from "./sections/section-2"

export function AgentSettingsPage() {
  return (
    <div className="bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <Section1Section />
        <Section2Section />
      </div>
    </div>
  )
}
