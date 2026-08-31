import { ChatbotSettingsPage } from "@/components/stitch/pages/chatbot-settings/page"
import {
  getChatbotInfrastructureStatus,
  getChatbotSettings,
  listChatbotShowingTemplates,
  listChatbotKnowledge,
} from "@/lib/tenant-chatbot-actions"
import { getTenantProperties } from "@/lib/tenant-dashboard-actions"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata = {
  title: "Knowledge Chatbot Settings",
  description: "Control evidence-first chatbot channels, rules, and knowledge.",
}

export default async function Page() {
  await requireDashboardAccess("settings")
  const [settings, knowledge, properties, showingTemplates] = await Promise.all([
    getChatbotSettings(),
    listChatbotKnowledge(),
    getTenantProperties(),
    listChatbotShowingTemplates(),
  ])
  return (
    <ChatbotSettingsPage
      initialSettings={settings}
      initialKnowledge={knowledge}
      initialProperties={properties}
      showingTemplates={showingTemplates}
    />
  )
}
