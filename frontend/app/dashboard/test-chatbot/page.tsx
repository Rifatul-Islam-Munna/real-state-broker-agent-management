import { TestChatbotPage } from "@/components/stitch/pages/test-chatbot/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = {
  title: "Test Knowledge Chatbot",
  description: "Simulate evidence-first chatbot decisions without contacting leads.",
}

export default async function Page() {
  await requireDashboardAccess("lead")
  return <TestChatbotPage />
}
