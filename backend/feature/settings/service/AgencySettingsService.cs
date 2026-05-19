using System.Text.Json;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public enum AgencyCommunicationChannel
    {
        Email,
        SMS,
        WhatsApp,
    }

    public class AgencySettingsImageAsset
    {
        public string Url { get; set; } = string.Empty;
        public string? ObjectName { get; set; }
    }

    public class AgencySocialLinkItem
    {
        public string Platform { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
    }

    public class AgencyProfileSettingsPayload
    {
        public string AgencyName { get; set; } = string.Empty;
        public string TaxId { get; set; } = string.Empty;
        public string StandardCommissionPercent { get; set; } = string.Empty;
        public AgencySettingsImageAsset Logo { get; set; } = new();
        public List<string> OfficeLocations { get; set; } = [];
        public string ContactEmail { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public List<AgencySocialLinkItem> SocialLinks { get; set; } = [];
    }

    public class AgencyCommunicationTemplateItem
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public List<AgencyCommunicationChannel> Channels { get; set; } = [];
        public List<string> VariableTokens { get; set; } = [];
    }

    public class AgencySettingsPayload
    {
        public AgencyProfileSettingsPayload Profile { get; set; } = new();
        public List<AgencyCommunicationTemplateItem> CommunicationTemplates { get; set; } = [];
    }

    public class UpdateAgencySettingsRequest : AgencySettingsPayload
    {
    }

    public class AgencySettingsResponse : AgencySettingsPayload
    {
        public DateTime UpdatedAt { get; set; }
    }

    public class PublicAgencyProfileSettingsResponse
    {
        public string AgencyName { get; set; } = string.Empty;
        public AgencySettingsImageAsset Logo { get; set; } = new();
        public List<string> OfficeLocations { get; set; } = [];
        public string ContactEmail { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public List<AgencySocialLinkItem> SocialLinks { get; set; } = [];
    }

    public class PublicAgencySettingsResponse
    {
        public PublicAgencyProfileSettingsResponse Profile { get; set; } = new();
        public DateTime UpdatedAt { get; set; }
    }

    public class AgencySettingsService
    {
        private const int SettingsRecordId = 1;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        private static readonly string[] SocialPlatforms =
        [
            "facebook",
            "instagram",
            "linkedin",
            "x",
            "youtube",
            "tiktok",
        ];

        private readonly AppDbContext _db;

        public AgencySettingsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<AgencySettingsResponse> GetAdminSettingsAsync()
        {
            var record = await _db.AgencySettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId);

            var content = record is null ? CreateDefaultPayload() : ReadPayload(record.ContentJson);
            var updatedAt = record?.UpdatedAt ?? DateTime.UtcNow;

            return MapResponse(content, updatedAt);
        }

        public async Task<PublicAgencySettingsResponse> GetPublicSettingsAsync()
        {
            var record = await _db.AgencySettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId);

            var content = record is null ? CreateDefaultPayload() : ReadPayload(record.ContentJson);
            var updatedAt = record?.UpdatedAt ?? DateTime.UtcNow;

            return MapPublicResponse(content.Profile, updatedAt);
        }

        public async Task<AgencySettingsResponse> UpdateSettingsAsync(UpdateAgencySettingsRequest request)
        {
            var payload = NormalizePayload(request);
            var now = DateTime.UtcNow;

            var record = await _db.AgencySettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId);
            if (record is null)
            {
                record = new AgencySettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.AgencySettings.AddAsync(record);
            }

            record.ContentJson = JsonSerializer.Serialize(payload, JsonOptions);
            record.UpdatedAt = now;

            await _db.SaveChangesAsync();

            return MapResponse(payload, record.UpdatedAt);
        }

        public async Task<List<AgencyCommunicationTemplateItem>> GetCommunicationTemplatesAsync(CancellationToken ct = default)
        {
            var settings = await GetAdminSettingsAsync();
            return settings.CommunicationTemplates;
        }

        public async Task<AgencyCommunicationTemplateItem> SaveCommunicationTemplateAsync(
            AgencyCommunicationTemplateItem request,
            CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var record = await _db.AgencySettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);
            var payload = record is null ? CreateDefaultPayload() : ReadPayload(record.ContentJson);
            var template = NormalizeTemplateItem(request, payload.CommunicationTemplates.FirstOrDefault());
            var existingIndex = payload.CommunicationTemplates.FindIndex(item =>
                string.Equals(item.Id, template.Id, StringComparison.OrdinalIgnoreCase));

            if (existingIndex >= 0)
            {
                payload.CommunicationTemplates[existingIndex] = template;
            }
            else
            {
                payload.CommunicationTemplates.Insert(0, template);
            }

            if (record is null)
            {
                record = new AgencySettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.AgencySettings.AddAsync(record, ct);
            }

            record.ContentJson = JsonSerializer.Serialize(NormalizePayload(payload), JsonOptions);
            record.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);

            return template;
        }

        public async Task<bool> DeleteCommunicationTemplateAsync(string id, CancellationToken ct = default)
        {
            var normalizedId = NormalizeLooseText(id);
            if (normalizedId.Length == 0)
            {
                return false;
            }

            var record = await _db.AgencySettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);
            if (record is null)
            {
                return false;
            }

            var payload = ReadPayload(record.ContentJson);
            var removedCount = payload.CommunicationTemplates.RemoveAll(item =>
                string.Equals(item.Id, normalizedId, StringComparison.OrdinalIgnoreCase));

            if (removedCount == 0)
            {
                return false;
            }

            record.ContentJson = JsonSerializer.Serialize(NormalizePayload(payload), JsonOptions);
            record.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return true;
        }

        private static AgencySettingsResponse MapResponse(AgencySettingsPayload payload, DateTime updatedAt)
        {
            return new AgencySettingsResponse
            {
                Profile = payload.Profile,
                CommunicationTemplates = payload.CommunicationTemplates,
                UpdatedAt = updatedAt,
            };
        }

        private static PublicAgencySettingsResponse MapPublicResponse(
            AgencyProfileSettingsPayload profile,
            DateTime updatedAt)
        {
            return new PublicAgencySettingsResponse
            {
                Profile = new PublicAgencyProfileSettingsResponse
                {
                    AgencyName = profile.AgencyName,
                    Logo = profile.Logo,
                    OfficeLocations = profile.OfficeLocations,
                    ContactEmail = profile.ContactEmail,
                    ContactPhone = profile.ContactPhone,
                    SocialLinks = profile.SocialLinks,
                },
                UpdatedAt = updatedAt,
            };
        }

        private static AgencySettingsPayload ReadPayload(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return CreateDefaultPayload();
            }

            try
            {
                return NormalizePayload(JsonSerializer.Deserialize<AgencySettingsPayload>(json, JsonOptions));
            }
            catch
            {
                return CreateDefaultPayload();
            }
        }

        private static AgencySettingsPayload NormalizePayload(AgencySettingsPayload? input)
        {
            var defaults = CreateDefaultPayload();

            return new AgencySettingsPayload
            {
                Profile = NormalizeProfile(input?.Profile, defaults.Profile),
                CommunicationTemplates = NormalizeTemplates(input?.CommunicationTemplates, defaults.CommunicationTemplates),
            };
        }

        private static AgencyProfileSettingsPayload NormalizeProfile(
            AgencyProfileSettingsPayload? input,
            AgencyProfileSettingsPayload fallback)
        {
            var officeLocations = (input?.OfficeLocations ?? [])
                .Select(item => (item ?? string.Empty).Trim())
                .Where(item => item.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return new AgencyProfileSettingsPayload
            {
                AgencyName = NormalizeText(input?.AgencyName, fallback.AgencyName),
                TaxId = NormalizeLooseText(input?.TaxId),
                StandardCommissionPercent = NormalizeLooseText(input?.StandardCommissionPercent, fallback.StandardCommissionPercent),
                Logo = NormalizeImage(input?.Logo),
                OfficeLocations = officeLocations.Count > 0 ? officeLocations : [.. fallback.OfficeLocations],
                ContactEmail = NormalizeText(input?.ContactEmail, fallback.ContactEmail),
                ContactPhone = NormalizeLooseText(input?.ContactPhone, fallback.ContactPhone),
                SocialLinks = NormalizeSocialLinks(input?.SocialLinks, fallback.SocialLinks),
            };
        }

        private static AgencySettingsImageAsset NormalizeImage(AgencySettingsImageAsset? input)
        {
            return new AgencySettingsImageAsset
            {
                Url = NormalizeLooseText(input?.Url),
                ObjectName = NormalizeNullableText(input?.ObjectName),
            };
        }

        private static List<AgencySocialLinkItem> NormalizeSocialLinks(
            IReadOnlyList<AgencySocialLinkItem>? items,
            IReadOnlyList<AgencySocialLinkItem> fallback)
        {
            return SocialPlatforms
                .Select(platform =>
                {
                    var fallbackItem = fallback.First(item =>
                        string.Equals(item.Platform, platform, StringComparison.OrdinalIgnoreCase));
                    var matchingItem = items?.FirstOrDefault(item =>
                        string.Equals(item.Platform, platform, StringComparison.OrdinalIgnoreCase));

                    return new AgencySocialLinkItem
                    {
                        Platform = platform,
                        Url = NormalizeLooseText(matchingItem?.Url, fallbackItem.Url),
                    };
                })
                .ToList();
        }

        private static List<AgencyCommunicationTemplateItem> NormalizeTemplates(
            IReadOnlyList<AgencyCommunicationTemplateItem>? items,
            IReadOnlyList<AgencyCommunicationTemplateItem> fallback)
        {
            var source = items is { Count: > 0 } ? items : fallback;

            return source
                .Select((item, index) =>
                {
                    var defaultItem = fallback.ElementAtOrDefault(index) ?? fallback[0];
                    var channels = (item.Channels ?? [])
                        .Where(channel => Enum.IsDefined(channel))
                        .Distinct()
                        .ToList();

                    var variableTokens = (item.VariableTokens ?? [])
                        .Select(token => (token ?? string.Empty).Trim())
                        .Where(token => token.Length > 0)
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .ToList();

                    return new AgencyCommunicationTemplateItem
                    {
                        Id = NormalizeText(item.Id, defaultItem.Id),
                        Name = NormalizeText(item.Name, defaultItem.Name),
                        Subject = NormalizeText(item.Subject, defaultItem.Subject),
                        Body = NormalizeText(item.Body, defaultItem.Body),
                        Channels = channels.Count > 0 ? channels : [.. defaultItem.Channels],
                        VariableTokens = variableTokens.Count > 0 ? variableTokens : [.. defaultItem.VariableTokens],
                    };
                })
                .ToList();
        }

        private static AgencyCommunicationTemplateItem NormalizeTemplateItem(
            AgencyCommunicationTemplateItem? input,
            AgencyCommunicationTemplateItem? fallback)
        {
            var templateFallback = fallback ?? CreateDefaultPayload().CommunicationTemplates[0];
            var channels = (input?.Channels ?? [])
                .Where(channel => Enum.IsDefined(channel))
                .Distinct()
                .ToList();
            var variableTokens = (input?.VariableTokens ?? [])
                .Select(token => (token ?? string.Empty).Trim())
                .Where(token => token.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return new AgencyCommunicationTemplateItem
            {
                Id = NormalizeText(input?.Id, Guid.NewGuid().ToString("N")),
                Name = NormalizeText(input?.Name, templateFallback.Name),
                Subject = NormalizeLooseText(input?.Subject),
                Body = NormalizeText(input?.Body, templateFallback.Body),
                Channels = channels.Count > 0 ? channels : [AgencyCommunicationChannel.Email],
                VariableTokens = variableTokens,
            };
        }

        private static string NormalizeText(string? value, string fallback)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string NormalizeLooseText(string? value, string fallback = "")
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string? NormalizeNullableText(string? value)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? null : normalized;
        }

        private static AgencySettingsPayload CreateDefaultPayload()
        {
            return new AgencySettingsPayload
            {
                Profile = new AgencyProfileSettingsPayload
                {
                    AgencyName = "",
                    TaxId = "",
                    StandardCommissionPercent = "3.0",
                    Logo = new AgencySettingsImageAsset(),
                    OfficeLocations = [],
                    ContactEmail = "",
                    ContactPhone = "",
                    SocialLinks =
                    [
                        new AgencySocialLinkItem { Platform = "facebook", Url = "" },
                        new AgencySocialLinkItem { Platform = "instagram", Url = "" },
                        new AgencySocialLinkItem { Platform = "linkedin", Url = "" },
                        new AgencySocialLinkItem { Platform = "x", Url = "" },
                        new AgencySocialLinkItem { Platform = "youtube", Url = "" },
                        new AgencySocialLinkItem { Platform = "tiktok", Url = "" },
                    ],
                },
                CommunicationTemplates =
                [
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "new-lead-welcome",
                        Name = "New Lead Welcome",
                        Subject = "Welcome to Skyline Real Estate, {{client_name}}!",
                        Body = "Hello {{client_name}}, Thank you for your interest in {{property_address}}. My name is {{agent_name}} and I'll be your primary point of contact. When is a good time for a quick call? Best regards, {{agency_name}}",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}", "{{agency_name}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "showing-confirmation",
                        Name = "Showing Confirmation",
                        Subject = "Your showing is confirmed for {{property_address}}",
                        Body = "Hi {{client_name}}, your showing for {{property_address}} is confirmed for {{showing_time}}. Reach out to {{agent_name}} if you need to reschedule.",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{showing_time}}", "{{agent_name}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "contract-executed",
                        Name = "Contract Executed",
                        Subject = "Contract executed for {{property_address}}",
                        Body = "Hello {{client_name}}, the contract for {{property_address}} has been executed successfully. {{agent_name}} will guide you through the next steps and timeline.",
                        Channels = [AgencyCommunicationChannel.Email],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "closing-reminder",
                        Name = "Closing Reminder",
                        Subject = "Closing reminder for {{property_address}}",
                        Body = "Hello {{client_name}}, this is a reminder that your closing for {{property_address}} is scheduled on {{closing_date}}. Please bring the requested documents and contact {{agent_name}} with any questions.",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{closing_date}}", "{{agent_name}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "follow-up-after-visit",
                        Name = "Follow-Up After Visit",
                        Subject = "Thanks for visiting {{property_address}}",
                        Body = "Hi {{client_name}}, thank you for viewing {{property_address}}. What questions can {{agent_name}} answer before your next step?",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS, AgencyCommunicationChannel.WhatsApp],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "document-request",
                        Name = "Document Request",
                        Subject = "Documents needed for {{property_address}}",
                        Body = "Hello {{client_name}}, please send {{document_list}} so {{agent_name}} can keep your deal moving for {{property_address}}.",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}", "{{document_list}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "deal-update",
                        Name = "Deal Update",
                        Subject = "Deal update for {{property_address}}",
                        Body = "Hi {{client_name}}, your deal for {{property_address}} is now at {{deal_stage}}. {{agent_name}} will follow up with the next action.",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS, AgencyCommunicationChannel.WhatsApp],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}", "{{deal_stage}}"],
                    },
                    new AgencyCommunicationTemplateItem
                    {
                        Id = "closing-congratulations",
                        Name = "Closing Congratulations",
                        Subject = "Congratulations on closing {{property_address}}",
                        Body = "Congratulations {{client_name}}! Closing for {{property_address}} is complete. {{agency_name}} and {{agent_name}} are grateful to be part of the move.",
                        Channels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.WhatsApp],
                        VariableTokens = ["{{client_name}}", "{{property_address}}", "{{agent_name}}", "{{agency_name}}"],
                    },
                ],
            };
        }
    }
}
