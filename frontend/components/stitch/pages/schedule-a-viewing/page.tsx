import { PublicPrimaryNavbar } from "@/components/stitch/public/public-primary-navbar"
import { Section1Section } from "./sections/section-1"
import { SimpleSuccessToastSimulatedSection } from "./sections/simple-success-toast-simulated"

export function ScheduleAViewingPage() {
  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <PublicPrimaryNavbar />
      <Section1Section />
      <SimpleSuccessToastSimulatedSection />
    </div>
  )
}
