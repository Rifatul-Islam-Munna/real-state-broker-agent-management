import { ChatbotSettingsPage } from "@/components/stitch/pages/chatbot-settings/page"
import { getChatbotSettings, listChatbotKnowledge } from "@/lib/tenant-chatbot-actions"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = {
  title: "Knowledge Chatbot Settings",
  description: "Control evidence-first chatbot channels, rules, and knowledge.",
}

export default async function Page() {
  await requireDashboardAccess("settings")
  const [settings, knowledge] = await Promise.all([
    getChatbotSettings(),
    listChatbotKnowledge(),
  ])
  return <ChatbotSettingsPage initialSettings={settings} initialKnowledge={knowledge} />
}
