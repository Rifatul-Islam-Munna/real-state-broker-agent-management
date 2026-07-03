import type { AgentUserOption } from "@/hooks/use-real-estate-api"
import {
  type AgentRoutePermission,
  agentRouteAccessItems,
} from "@/lib/agent-route-access"

export type SortKey = "created" | "listings" | "name"
export type AccessMode = "full" | "custom"
export type AgentDialogState =
  | { mode: "create" }
  | { mode: "edit"; agent: AgentUserOption }
  | null

export type AgentFormValues = {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  agencyName: string
  licenseNumber: string
  commissionRate: string
  avatarUrl: string
  bio: string
  isVerifiedAgent: boolean
  isActive: boolean
  accessMode: AccessMode
  agentRoutePermissions: string[]
}

export type AgentFormErrors = Partial<
  Record<keyof AgentFormValues | "form", string>
>

export const initialAgentValues: AgentFormValues = {
  accessMode: "full",
  agentRoutePermissions: [],
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  agencyName: "",
  licenseNumber: "",
  commissionRate: "",
  avatarUrl: "",
  bio: "",
  isVerifiedAgent: false,
  isActive: true,
}

const agentRouteLabelMap = new Map<AgentRoutePermission, string>(
  agentRouteAccessItems.map((item) => [item.permission, item.label] as const),
)

export function displayAgentText(value?: string | null, fallback = "Not set") {
  const text = value?.trim() ?? ""
  return text.length > 0 ? text : fallback
}

export function agentInitials(agent: AgentUserOption) {
  const parts = (agent.fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "A"}${parts[1]?.[0] ?? ""}`.toUpperCase()
}

export function formatAgentCreatedAt(value?: string) {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString()
}

export function parseCommissionRate(value: string) {
  const numericValue = Number.parseFloat(value.trim())
  return Number.isFinite(numericValue) ? numericValue : null
}

export function formatAccessSummary(agent: AgentUserOption) {
  return agent.hasCustomAgentRoutePermissions ? "Custom access" : "Full access"
}

export function formatAccessDetails(agent: AgentUserOption) {
  if (!agent.hasCustomAgentRoutePermissions) return "All agent portal routes"

  const labels = (agent.agentRoutePermissions ?? [])
    .map(
      (permission) =>
        agentRouteLabelMap.get(permission as AgentRoutePermission) ?? permission,
    )
    .filter(Boolean)

  return labels.length > 0 ? labels.join(", ") : "No routes selected"
}

export function buildAgentInitialValues(
  agent?: AgentUserOption | null,
): AgentFormValues {
  if (!agent) return initialAgentValues

  const fullNameParts = (agent.fullName ?? "").trim().split(/\s+/).filter(Boolean)

  return {
    accessMode: agent.hasCustomAgentRoutePermissions ? "custom" : "full",
    agencyName: agent.agencyName ?? "",
    agentRoutePermissions: agent.hasCustomAgentRoutePermissions
      ? [...(agent.agentRoutePermissions ?? [])]
      : [],
    avatarUrl: agent.avatarUrl ?? "",
    bio: agent.bio ?? "",
    commissionRate:
      agent.commissionRate != null ? `${agent.commissionRate}` : "",
    email: agent.email ?? "",
    firstName: fullNameParts[0] || "",
    isActive: agent.isActive ?? true,
    isVerifiedAgent: agent.isVerifiedAgent,
    lastName: fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : "",
    licenseNumber: agent.licenseNumber ?? "",
    password: "",
    phone: agent.phone ?? "",
  }
}

export function validateAgentValues(
  values: AgentFormValues,
  mode: "create" | "edit",
) {
  const errors: AgentFormErrors = {}

  if (!values.firstName.trim()) errors.firstName = "First name is required."
  if (!values.lastName.trim()) errors.lastName = "Last name is required."
  if (!values.email.trim()) {
    errors.email = "Email is required."
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address."
  }
  if (mode === "create" && values.password.trim().length < 6) {
    errors.password = "Password must be at least 6 characters."
  }
  if (
    mode === "edit" &&
    values.password.trim().length > 0 &&
    values.password.trim().length < 6
  ) {
    errors.password = "Password must be at least 6 characters."
  }
  if (
    values.commissionRate.trim() &&
    parseCommissionRate(values.commissionRate) === null
  ) {
    errors.commissionRate = "Enter a valid commission rate."
  }
  if (values.accessMode === "custom" && values.agentRoutePermissions.length === 0) {
    errors.agentRoutePermissions = "Select at least one route permission."
  }

  return errors
}
