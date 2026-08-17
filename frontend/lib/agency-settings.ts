import type { AgencySettings } from "@/@types/real-estate-api"
import {
  createDefaultAgencySocialLinks,
  normalizeAgencySocialLinks,
} from "@/lib/agency-social-links"

export type ShowingFeedbackAutomationSettings = {
  enabled: boolean
  /** Internal compatibility field: 0-6 represents Sunday-Saturday for the weekly report. */
  gapDays: number
  channels: Array<"Email" | "SMS">
  templateId: string
  compressWithAi: boolean
  sentimentFilter: "all" | "negative"
  maxFeedback: number
  autoClassifyMinConfidence: number
  aiFallbackMinConfidence: number
  negativeKnowledge: string
  positiveKnowledge: string
}

export type LeadAutomationSettings = {
  enabled: boolean
  channels: Array<"Email" | "SMS">
  directTemplateId: string
  leadShowingTemplateId: string
  realtorShowingTemplateId: string
  followUpEnabled: boolean
}

export type FirstMessageAutomationSettings = {
  lead: boolean
  leadShowing: boolean
  realtorShowing: boolean
  delayMinutes?: number
  leadDelayMinutes: number
  leadShowingDelayMinutes: number
  realtorShowingDelayMinutes: number
}

export type LeadIntelligenceSettings = {
  qualifiedKnowledge: string
  unqualifiedKnowledge: string
  learnedQualified: string[]
  learnedUnqualified: string[]
}

export type AgencyWorkspaceSettings = AgencySettings & {
  leadAutomation: LeadAutomationSettings
  firstMessageAutomation: FirstMessageAutomationSettings
  leadIntelligence: LeadIntelligenceSettings
  showingFeedbackAutomation: ShowingFeedbackAutomationSettings
}

export const defaultAgencySettings: AgencyWorkspaceSettings = {
  profile: {
    agencyName: "",
    taxId: "",
    standardCommissionPercent: "3.0",
    logo: { objectName: null, url: "" },
    officeLocations: [""],
    contactEmail: "",
    contactPhone: "",
    defaultPhoneCountry: "US",
    socialLinks: createDefaultAgencySocialLinks(),
  },
  showingFeedbackAutomation: {
    enabled: false,
    gapDays: 1,
    channels: ["Email"],
    templateId: "owner-feedback-summary",
    compressWithAi: true,
    sentimentFilter: "all",
    maxFeedback: 10,
    autoClassifyMinConfidence: 72,
    aiFallbackMinConfidence: 0,
    negativeKnowledge: [
      "Client felt price was too high for the condition.",
      "Buyer did not like the layout, location, parking, noise, smell, size, or repairs needed.",
      "Realtor says the client is not interested after viewing.",
    ].join("\n"),
    positiveKnowledge: [
      "Client loved the property and wants next steps.",
      "Buyer liked the layout, location, condition, price, light, or amenities.",
      "Realtor says the showing went well and client is interested.",
    ].join("\n"),
  },
  leadAutomation: {
    enabled: true,
    channels: ["Email"],
    directTemplateId: "new-lead-welcome",
    leadShowingTemplateId: "lead-showing-confirmation",
    realtorShowingTemplateId: "showing-confirmation",
    followUpEnabled: true,
  },
  firstMessageAutomation: {
    lead: true,
    leadShowing: true,
    realtorShowing: true,
    leadDelayMinutes: 0,
    leadShowingDelayMinutes: 0,
    realtorShowingDelayMinutes: 0,
  },
  leadIntelligence: {
    qualifiedKnowledge: [
      "Lead asks to schedule a showing, tour, viewing, or visit.",
      "Lead gives budget, timeline, pre-approval, cash offer, or move date.",
      "Lead says they are interested in buying, renting, applying, or making an offer.",
    ].join("\n"),
    unqualifiedKnowledge: [
      "Sender is vendor, recruiter, marketer, job seeker, spam, or partnership request.",
      "Sender only asks a generic question and shows no buyer/renter/seller intent.",
      "Sender says not interested, wrong number, unsubscribe, test, or maintenance request.",
    ].join("\n"),
    learnedQualified: [],
    learnedUnqualified: [],
  },
  communicationTemplates: [
    {
      body: "Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}",
      channels: ["Email", "SMS"],
      id: "new-lead-welcome",
      name: "New Lead Welcome",
      subject: "Welcome to Skyline Real Estate, {{client_name}}!",
      variableTokens: [
        "{{client_name}}",
        "{{property_address}}",
        "{{agent_name}}",
        "{{agency_name}}",
      ],
      audience: "Lead",
    },
    {
      body: "Hi {{client_name}}, your showing request for {{property_address}} is received. {{agent_name}} will confirm the best time shortly.",
      channels: ["Email", "SMS"],
      id: "lead-showing-confirmation",
      name: "Lead Showing Confirmation",
      subject: "Showing request received for {{property_address}}",
      variableTokens: [
        "{{client_name}}",
        "{{property_address}}",
        "{{agent_name}}",
      ],
      sequenceType: "Direct",
      gapDays: 0,
      isActive: true,
      attachPropertyDocuments: true,
      audience: "LeadShowing",
    },
    {
      body: "Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reach out to {{agent_name}} if you need to reschedule.",
      channels: ["Email", "SMS"],
      id: "showing-confirmation",
      name: "Showing Confirmation",
      subject: "Your showing is confirmed for {{property_address}}",
      variableTokens: [
        "{{client_name}}",
        "{{property_address}}",
        "{{showing_time}}",
        "{{agent_name}}",
      ],
      sequenceType: "Direct",
      gapDays: 0,
      isActive: true,
      attachPropertyDocuments: true,
      audience: "Realtor",
    },
    {
      body: "Hello {{client_name}}, the contract for {{property_address}} has been executed successfully. {{agent_name}} will guide you through the next steps and timeline.",
      channels: ["Email"],
      id: "contract-executed",
      name: "Contract Executed",
      subject: "Contract executed for {{property_address}}",
      variableTokens: [
        "{{client_name}}",
        "{{property_address}}",
        "{{agent_name}}",
      ],
      audience: "Lead",
    },
    {
      body: "Hello {{client_name}}, this is a reminder that your closing for {{property_address}} is scheduled on {{closing_date}}. Please bring the requested documents and contact {{agent_name}} with any questions.",
      channels: ["Email", "SMS"],
      id: "closing-reminder",
      name: "Closing Reminder",
      subject: "Closing reminder for {{property_address}}",
      variableTokens: [
        "{{client_name}}",
        "{{property_address}}",
        "{{closing_date}}",
        "{{agent_name}}",
      ],
      audience: "Lead",
    },
    {
      body: "Hello, here is the weekly showing feedback for {{property_address}} from {{fromdate}} to {{todate}}.\n\nPositive feedback\n{{positive_feedback}}\n\nNegative feedback\n{{negative_feedback}}\n\nSummary\n{{feedback_summary}}",
      channels: ["Email", "SMS"],
      id: "owner-feedback-summary",
      name: "Weekly Owner Feedback Summary",
      subject: "Weekly showing feedback for {{property_address}}",
      variableTokens: [
        "{{property_address}}",
        "{{fromdate}}",
        "{{todate}}",
        "{{feedback_summary}}",
        "{{positive_feedback}}",
        "{{negative_feedback}}",
        "{{positive_summary}}",
        "{{negative_summary}}",
        "{{feedback1}}",
      ],
      audience: "OwnerFeedback",
      isActive: true,
      attachPropertyDocuments: false,
    },
  ],
  updatedAt: "",
}

export function cloneAgencySettings(
  settings: AgencySettings & {
    leadAutomation?: Partial<LeadAutomationSettings>
    firstMessageAutomation?: Partial<FirstMessageAutomationSettings>
    leadIntelligence?: Partial<LeadIntelligenceSettings>
    showingFeedbackAutomation?: Partial<ShowingFeedbackAutomationSettings>
  }
): AgencyWorkspaceSettings {
  const normalizeDelay = (value: unknown) =>
    Math.min(1440, Math.max(0, Number(value ?? 0) || 0))
  const profile = settings.profile ?? defaultAgencySettings.profile
  const automation: Partial<ShowingFeedbackAutomationSettings> =
    settings.showingFeedbackAutomation ?? {}
  const leadAutomation: Partial<LeadAutomationSettings> =
    settings.leadAutomation ?? {}
  const firstMessageAutomation: Partial<FirstMessageAutomationSettings> =
    settings.firstMessageAutomation ?? {}
  const leadIntelligence: Partial<LeadIntelligenceSettings> =
    settings.leadIntelligence ?? {}
  const leadAutomationChannels = (leadAutomation.channels ?? ["Email"]).filter(
    (item): item is "Email" | "SMS" => item === "Email" || item === "SMS"
  )
  const communicationTemplates: AgencyWorkspaceSettings["communicationTemplates"] = (
    settings.communicationTemplates ??
    defaultAgencySettings.communicationTemplates
  ).map((item) => ({
    ...item,
    attachmentDocumentCategory: item.attachmentDocumentCategory ?? "",
    attachmentDocumentType: item.attachmentDocumentType ?? "",
    attachmentMode:
      item.attachmentMode ??
      (item.attachPropertyDocuments !== false ? "property" : "none"),
    channels: (item.channels ?? []).filter(
      (channel): channel is "Email" | "SMS" =>
        channel === "Email" || channel === "SMS"
    ),
    pdfTemplateId: item.pdfTemplateId ?? "",
    variableTokens: [...(item.variableTokens ?? [])],
  }))
  const existingShowingConfirmation = communicationTemplates.find((item) => item.id === "showing-confirmation")
  if (existingShowingConfirmation) {
    existingShowingConfirmation.audience = "Realtor"
    existingShowingConfirmation.sequenceType = "Direct"
    existingShowingConfirmation.gapDays = 0
  }
  const addDefaultTemplate = (templateId: string) => {
    if (communicationTemplates.some((item) => item.id === templateId)) return
    const template = defaultAgencySettings.communicationTemplates.find((item) => item.id === templateId)
    if (template) communicationTemplates.push({ ...template, variableTokens: [...(template.variableTokens ?? [])] })
  }
  addDefaultTemplate("lead-showing-confirmation")
  addDefaultTemplate("showing-confirmation")
  return {
    communicationTemplates,
    profile: {
      ...defaultAgencySettings.profile,
      ...profile,
      contactPhone: profile.contactPhone ?? "",
      defaultPhoneCountry: profile.defaultPhoneCountry ?? "US",
      logo: {
        objectName: profile.logo?.objectName ?? null,
        url: profile.logo?.url ?? "",
      },
      officeLocations: [
        ...(profile.officeLocations?.length
          ? profile.officeLocations
          : defaultAgencySettings.profile.officeLocations),
      ],
      socialLinks: normalizeAgencySocialLinks(profile.socialLinks).map(
        (item) => ({ ...item })
      ),
    },
    leadAutomation: {
      enabled: firstMessageAutomation.lead !== false,
      channels: leadAutomationChannels.length ? leadAutomationChannels : ["Email"],
      directTemplateId:
        leadAutomation.directTemplateId ||
        defaultAgencySettings.leadAutomation.directTemplateId,
      leadShowingTemplateId:
        leadAutomation.leadShowingTemplateId ||
        defaultAgencySettings.leadAutomation.leadShowingTemplateId,
      realtorShowingTemplateId:
        leadAutomation.realtorShowingTemplateId ||
        defaultAgencySettings.leadAutomation.realtorShowingTemplateId,
      followUpEnabled: leadAutomation.followUpEnabled !== false,
    },
    firstMessageAutomation: {
      lead: firstMessageAutomation.lead !== false,
      leadShowing: firstMessageAutomation.leadShowing !== false,
      realtorShowing: firstMessageAutomation.realtorShowing !== false,
      leadDelayMinutes: normalizeDelay(
        firstMessageAutomation.leadDelayMinutes ??
          firstMessageAutomation.delayMinutes
      ),
      leadShowingDelayMinutes: normalizeDelay(
        firstMessageAutomation.leadShowingDelayMinutes ??
          firstMessageAutomation.delayMinutes
      ),
      realtorShowingDelayMinutes: normalizeDelay(
        firstMessageAutomation.realtorShowingDelayMinutes ??
          firstMessageAutomation.delayMinutes
      ),
    },
    leadIntelligence: {
      qualifiedKnowledge:
        leadIntelligence.qualifiedKnowledge ??
        defaultAgencySettings.leadIntelligence.qualifiedKnowledge,
      unqualifiedKnowledge:
        leadIntelligence.unqualifiedKnowledge ??
        defaultAgencySettings.leadIntelligence.unqualifiedKnowledge,
      learnedQualified: [...(leadIntelligence.learnedQualified ?? [])],
      learnedUnqualified: [...(leadIntelligence.learnedUnqualified ?? [])],
    },
    showingFeedbackAutomation: {
      enabled: automation.enabled === true,
      gapDays: Math.min(6, Math.max(0, Number(automation.gapDays ?? 1) || 0)),
      channels: (automation.channels ?? ["Email"]).filter(
        (item): item is "Email" | "SMS" => item === "Email" || item === "SMS"
      ),
      templateId: automation.templateId || "owner-feedback-summary",
      compressWithAi: automation.compressWithAi !== false,
      sentimentFilter: automation.sentimentFilter === "negative" ? "negative" : "all",
      maxFeedback: Math.min(
        50,
        Math.max(1, Number(automation.maxFeedback ?? 10) || 10)
      ),
      autoClassifyMinConfidence: Math.min(
        100,
        Math.max(1, Number(automation.autoClassifyMinConfidence ?? 72) || 72)
      ),
      aiFallbackMinConfidence: Math.min(
        100,
        Math.max(
          0,
          Number.isFinite(Number(automation.aiFallbackMinConfidence))
            ? Number(automation.aiFallbackMinConfidence)
            : 0
        )
      ),
      negativeKnowledge:
        automation.negativeKnowledge ??
        defaultAgencySettings.showingFeedbackAutomation.negativeKnowledge,
      positiveKnowledge:
        automation.positiveKnowledge ??
        defaultAgencySettings.showingFeedbackAutomation.positiveKnowledge,
    },
    updatedAt: settings.updatedAt ?? "",
  }
}
