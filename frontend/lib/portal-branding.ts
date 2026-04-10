type BrandingProfile =
  | {
      agencyName?: string | null
      logo?: {
        url?: string | null
      } | null
    }
  | null
  | undefined

export function resolvePortalBranding(profile: BrandingProfile) {
  return {
    agencyName: profile?.agencyName?.trim() || "Agency",
    logoUrl: profile?.logo?.url?.trim() || "",
  }
}
