import type { Metadata } from "next"

import { PropertyOperationsPlatformPage } from "@/components/property-operations-platform/platform-page"
import { requireDashboardAccess } from "@/lib/dashboard-auth"

export const metadata: Metadata = {
  title: "Property Operations",
  description: "Complete property operations workspace for agents and administrators.",
}

type Props = {
  searchParams: Promise<{
    tab?: string | string[]
    module?: string | string[]
  }>
}

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

const moduleAliases: Record<string, string> = {
  portfolio: "properties",
  "property-health": "health",
  announcements: "notices",
  messages: "notifications",
  "public-portals": "public-links",
  organization: "settings",
  audit: "reports",
  analytics: "reports",
  "vendor-quotes": "quotes",
  "recurring-maintenance": "recurring",
}

function resolveSlug(tab?: string, module?: string) {
  if (tab === "requests") return "public-links"
  if (tab === "settings") return "settings"
  if (tab === "overview" || !tab) return undefined
  if (tab === "modules") {
    if (!module) return "properties"
    return moduleAliases[module] ?? module
  }
  return module ? moduleAliases[module] ?? module : undefined
}

export default async function Page({ searchParams }: Props) {
  await requireDashboardAccess("properties")
  const params = await searchParams
  const slug = resolveSlug(first(params.tab), first(params.module))
  return <PropertyOperationsPlatformPage slug={slug} />
}
