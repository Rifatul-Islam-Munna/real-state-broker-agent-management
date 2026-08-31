import { BotActivityPage } from "@/components/stitch/pages/bot-activity/page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"
import { listBotActivity } from "@/lib/tenant-chatbot-actions"

export const metadata = {
  title: "Bot Activity",
  description: "Review seven days of tenant chatbot messages and decisions.",
}

export default async function Page() {
  await requireDashboardAccess("lead")
  const activity = await listBotActivity()
  return <BotActivityPage initialActivity={activity} />
}
