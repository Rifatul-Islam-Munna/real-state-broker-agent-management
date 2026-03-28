import type { AgencySocialLink, AgencySocialLinkPlatform } from "@/@types/real-estate-api"

export const agencySocialPlatformOptions: Array<{
  platform: AgencySocialLinkPlatform
  label: string
  icon: string
  placeholder: string
}> = [
  {
    platform: "facebook",
    label: "Facebook",
    icon: "facebook",
    placeholder: "https://facebook.com/your-page",
  },
  {
    platform: "instagram",
    label: "Instagram",
    icon: "instagram",
    placeholder: "https://instagram.com/your-handle",
  },
  {
    platform: "linkedin",
    label: "LinkedIn",
    icon: "linkedin",
    placeholder: "https://linkedin.com/company/your-company",
  },
  {
    platform: "x",
    label: "X",
    icon: "x_social",
    placeholder: "https://x.com/your-handle",
  },
  {
    platform: "youtube",
    label: "YouTube",
    icon: "youtube",
    placeholder: "https://youtube.com/@your-channel",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    icon: "tiktok",
    placeholder: "https://tiktok.com/@your-handle",
  },
]

export function createDefaultAgencySocialLinks(): AgencySocialLink[] {
  return agencySocialPlatformOptions.map((item) => ({
    platform: item.platform,
    url: "",
  }))
}

export function normalizeAgencySocialLinks(links?: AgencySocialLink[] | null): AgencySocialLink[] {
  const source = links ?? []

  return agencySocialPlatformOptions.map((item) => ({
    platform: item.platform,
    url: source.find((entry) => entry.platform === item.platform)?.url ?? "",
  }))
}

export function getConfiguredAgencySocialLinks(links?: AgencySocialLink[] | null) {
  return normalizeAgencySocialLinks(links).filter((item) => item.url.trim().length > 0)
}
