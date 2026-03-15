export const agentSettingsOverviewCards = [
  {
    label: "Active Leads",
    value: "18",
    detail: "Assigned for follow-up this week",
    icon: "group",
  },
  {
    label: "Open Listings",
    value: "7",
    detail: "Currently managed by this agent",
    icon: "domain",
  },
  {
    label: "Pending Deals",
    value: "5",
    detail: "Across offer and contract stages",
    icon: "partner_exchange",
  },
] as const

export const agentSettingsProfile = {
  bio: "Residential specialist focused on buyer matching, local market tours, and faster lead follow-up.",
  email: "alex.morgan@estateblue.com",
  focusArea: "Residential Buyers and Waterfront Homes",
  fullName: "Alex Morgan",
  licenseId: "AGT-2048-CA",
  phone: "(555) 203-7811",
} as const

export const agentSettingsPreferences = [
  {
    id: "instantLeadAlerts",
    label: "Instant lead alerts",
    description: "Receive a notification as soon as a new qualified lead is assigned.",
    enabled: true,
    icon: "notifications_active",
  },
  {
    id: "dealMilestones",
    label: "Deal milestone updates",
    description: "Get updates when a deal moves to offer accepted, contract, or closing.",
    enabled: true,
    icon: "partner_exchange",
  },
  {
    id: "dailyMailDigest",
    label: "Daily mail digest",
    description: "Bundle inbox activity into a daily summary instead of separate alerts.",
    enabled: false,
    icon: "mail",
  },
  {
    id: "calendarReminders",
    label: "Calendar reminders",
    description: "Send reminders before tours, follow-up calls, and contract deadlines.",
    enabled: true,
    icon: "event_available",
  },
] as const

export const agentSettingsAvailability = [
  {
    label: "Primary Market",
    value: "Downtown, Riverfront, and Eastside",
  },
  {
    label: "Working Hours",
    value: "Mon - Sat / 9:00 AM - 7:00 PM",
  },
  {
    label: "Preferred Contact",
    value: "Phone and email",
  },
  {
    label: "Password",
    value: "Last updated 14 days ago",
  },
] as const
