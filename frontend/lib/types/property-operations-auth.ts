// @ts-nocheck
export type AuthUser = {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  organizationId?: string | null
  organizationIds: string[]
  jobTitle?: string | null
  avatarUrl?: string | null
  createdByUserId?: string | null
  createdByRole?: "super_admin" | "admin" | "tetentwoner" | "worker" | "renter" | "guest" | null
  firstAddedByOwnerId?: string | null
  ownerIds?: string[]
  activeOwnerId?: string | null
  propertyIds?: string[]
  activePropertyId?: string | null
  isGlobalProfile?: boolean
  ownerProfileType?: "primary_owner" | "co_owner" | "manager" | null
  canManageOwnerTeam: boolean
  role: "super_admin" | "admin" | "tetentwoner" | "worker" | "renter" | "guest"
  status: "invited" | "active" | "suspended"
  subscriptionTier?: "starter" | "growth" | "enterprise" | null
  subscriptionRequired: boolean
  subscriptionActive: boolean
  subscriptionStartsAt?: string | null
  subscriptionEndsAt?: string | null
  lastLoginAt?: string | null
}

export type AuthResponse = {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export type LoginPayload = {
  email: string
  password: string
}

export type WorkerSignupPayload = {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  jobTitle?: string
}

export type PublicSignupPayload = WorkerSignupPayload & {
  role: "worker" | "tetentwoner" | "renter" | "guest"
}
