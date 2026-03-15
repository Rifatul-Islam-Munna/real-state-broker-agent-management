import { Section1Section } from "./sections/section-1"

export function MailInboxPage() {
  return (
    <div className="bg-background-light font-sans text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="flex min-h-screen w-full flex-col overflow-x-hidden">
        <Section1Section />
      </div>
    </div>
  )
}
