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

export function cloneMarketingSettings(settings: MarketingSettings): MarketingSettings {
  return {
    summary: {
      emailOpenRate: { ...settings.summary.emailOpenRate },
      smsCtr: { ...settings.summary.smsCtr },
      conversions: { ...settings.summary.conversions },
      socialReach: { ...settings.summary.socialReach },
    },
    emailCampaigns: settings.emailCampaigns.map((item) => ({ ...item })),
    smsStatuses: settings.smsStatuses.map((item) => ({ ...item })),
    homepageBoost: {
      ...settings.homepageBoost,
      slots: settings.homepageBoost.slots.map((item) => ({ ...item })),
    },
    templates: settings.templates.map((item) => ({ ...item })),
    socialSharing: {
      ...settings.socialSharing,
      channels: settings.socialSharing.channels.map((item) => ({ ...item })),
    },
    updatedAt: settings.updatedAt ?? null,
  }
}
