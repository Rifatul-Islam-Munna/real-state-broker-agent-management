
import { AppIcon } from "@/components/ui/app-icon"

export function SimpleSuccessToastSimulatedSection() {
  return (
    <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-3 rounded-lg flex items-center gap-3 border-none opacity-0 pointer-events-none">
      <AppIcon name="check_circle" />
      <span className="font-medium">
        {"Request Sent Successfully!"}
      </span>
    </div>
  )
}
