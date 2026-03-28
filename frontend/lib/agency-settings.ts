import type { AgencySettings } from "@/@types/real-estate-api"
import { createDefaultAgencySocialLinks, normalizeAgencySocialLinks } from "@/lib/agency-social-links"

export const defaultAgencySettings: AgencySettings = {
  profile: {
    agencyName: "",
    taxId: "",
    standardCommissionPercent: "3.0",
    logo: {
      objectName: null,
      url: "",
    },
    officeLocations: [""],
    contactEmail: "",
    contactPhone: "",
    socialLinks: createDefaultAgencySocialLinks(),
  },
  communicationTemplates: [
    {
      body:
        "Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}",
      channels: ["Email", "SMS"],
      id: "new-lead-welcome",
      name: "New Lead Welcome",
      subject: "Welcome to Skyline Real Estate, {{client_name}}!",
      variableTokens: ["{{client_name}}", "{{property_address}}", "{{agent_name}}", "{{agency_name}}"],
    },
    {
      body:
        "Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reach out to {{agent_name}} if you need to reschedule.",
      channels: ["Email", "SMS"],
      id: "showing-confirmation",
      name: "Showing Confirmation",
      subject: "Your showing is confirmed for {{property_address}}",
      variableTokens: ["{{client_name}}", "{{property_address}}", "{{showing_time}}", "{{agent_name}}"],
    },
    {
      body:
        "Hello {{client_name}}, the contract for {{property_address}} has been executed successfully. {{agent_name}} will guide you through the next steps and timeline.",
      channels: ["Email"],
      id: "contract-executed",
      name: "Contract Executed",
      subject: "Contract executed for {{property_address}}",
      variableTokens: ["{{client_name}}", "{{property_address}}", "{{agent_name}}"],
    },
    {
      body:
        "Hello {{client_name}}, this is a reminder that your closing for {{property_address}} is scheduled on {{closing_date}}. Please bring the requested documents and contact {{agent_name}} with any questions.",
      channels: ["Email", "SMS"],
      id: "closing-reminder",
      name: "Closing Reminder",
      subject: "Closing reminder for {{property_address}}",
      variableTokens: ["{{client_name}}", "{{property_address}}", "{{closing_date}}", "{{agent_name}}"],
    },
  ],
  updatedAt: "",
}

export function cloneAgencySettings(settings: AgencySettings): AgencySettings {
  const profile = settings.profile ?? defaultAgencySettings.profile

  return {
    communicationTemplates: (settings.communicationTemplates ?? defaultAgencySettings.communicationTemplates).map((item) => ({
      ...item,
      channels: [...(item.channels ?? [])],
      variableTokens: [...(item.variableTokens ?? [])],
    })),
    profile: {
      ...defaultAgencySettings.profile,
      ...profile,
      contactPhone: profile.contactPhone ?? "",
      logo: {
        objectName: profile.logo?.objectName ?? null,
        url: profile.logo?.url ?? "",
      },
      officeLocations: [...(profile.officeLocations?.length ? profile.officeLocations : defaultAgencySettings.profile.officeLocations)],
      socialLinks: normalizeAgencySocialLinks(profile.socialLinks).map((item) => ({ ...item })),
    },
    updatedAt: settings.updatedAt ?? "",
  }
}
