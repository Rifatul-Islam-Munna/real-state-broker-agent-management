import type { MarketingSettings } from "@/@types/real-estate-api"

export const defaultMarketingSettings: MarketingSettings = {
  summary: {
    emailOpenRate: {
      value: "",
      deltaLabel: "",
      progressPercent: 0,
      trendDirection: "Stable",
    },
    smsCtr: {
      value: "",
      deltaLabel: "",
      progressPercent: 0,
      trendDirection: "Stable",
    },
    conversions: {
      value: "",
      deltaLabel: "",
      progressPercent: 0,
      trendDirection: "Stable",
    },
    socialReach: {
      value: "",
      deltaLabel: "",
      progressPercent: 0,
      trendDirection: "Stable",
    },
  },
  emailCampaigns: [],
  smsStatuses: [],
  homepageBoost: {
    title: "",
    description: "",
    buttonLabel: "",
    slots: [
      {
        id: "boost-slot-1",
        propertyId: null,
        isActive: false,
      },
      {
        id: "boost-slot-2",
        propertyId: null,
        isActive: false,
      },
    ],
  },
  templates: [],
  socialSharing: {
    autoPostEnabled: false,
    autoPostMessage: "",
    channels: [
      {
        id: "facebook",
        label: "Facebook",
        icon: "social_leaderboard",
        accentClassName: "bg-blue-600",
        isEnabled: false,
      },
      {
        id: "twitter",
        label: "Twitter",
        icon: "share",
        accentClassName: "bg-sky-400",
        isEnabled: false,
      },
      {
        id: "instagram",
        label: "Instagram",
        icon: "photo_camera",
        accentClassName: "bg-pink-600",
        isEnabled: false,
      },
      {
        id: "linkedin",
        label: "LinkedIn",
        icon: "work",
        accentClassName: "bg-blue-800",
        isEnabled: false,
      },
    ],
  },
  updatedAt: null,
}

export function cloneMarketingSettings(settings?: Partial<MarketingSettings> | null): MarketingSettings {
  const source = settings ?? {}
  const summary = source.summary ?? {}
  const homepageBoost = source.homepageBoost ?? {}
  const socialSharing = source.socialSharing ?? {}

  return {
    summary: {
      emailOpenRate: { ...defaultMarketingSettings.summary.emailOpenRate, ...(summary.emailOpenRate ?? {}) },
      smsCtr: { ...defaultMarketingSettings.summary.smsCtr, ...(summary.smsCtr ?? {}) },
      conversions: { ...defaultMarketingSettings.summary.conversions, ...(summary.conversions ?? {}) },
      socialReach: { ...defaultMarketingSettings.summary.socialReach, ...(summary.socialReach ?? {}) },
    },
    emailCampaigns: (source.emailCampaigns ?? defaultMarketingSettings.emailCampaigns).map((item) => ({ ...item })),
    smsStatuses: (source.smsStatuses ?? defaultMarketingSettings.smsStatuses).map((item) => ({ ...item })),
    homepageBoost: {
      ...defaultMarketingSettings.homepageBoost,
      ...homepageBoost,
      slots: (homepageBoost.slots ?? defaultMarketingSettings.homepageBoost.slots).map((item) => ({ ...item })),
    },
    templates: (source.templates ?? defaultMarketingSettings.templates).map((item) => ({ ...item })),
    socialSharing: {
      ...defaultMarketingSettings.socialSharing,
      ...socialSharing,
      channels: (socialSharing.channels ?? defaultMarketingSettings.socialSharing.channels).map((item) => ({ ...item })),
    },
    updatedAt: source.updatedAt ?? null,
  }
}
