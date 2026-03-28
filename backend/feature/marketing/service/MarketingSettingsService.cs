using System.Text.Json;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public enum MarketingTrendDirection
    {
        Up,
        Down,
        Stable
    }

    public class MarketingSummaryMetric
    {
        public string Value { get; set; } = string.Empty;
        public string DeltaLabel { get; set; } = string.Empty;
        public int ProgressPercent { get; set; }
        public MarketingTrendDirection TrendDirection { get; set; } = MarketingTrendDirection.Stable;
    }

    public class MarketingSummarySection
    {
        public MarketingSummaryMetric EmailOpenRate { get; set; } = new();
        public MarketingSummaryMetric SmsCtr { get; set; } = new();
        public MarketingSummaryMetric Conversions { get; set; } = new();
        public MarketingSummaryMetric SocialReach { get; set; } = new();
    }

    public class MarketingEmailCampaignItem
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int PerformancePercent { get; set; }
    }

    public class MarketingSmsStatusItem
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public int RecipientCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    }

    public class MarketingHomepageBoostSlot
    {
        public string Id { get; set; } = string.Empty;
        public int? PropertyId { get; set; }
        public bool IsActive { get; set; }
    }

    public class MarketingHomepageBoostSection
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string ButtonLabel { get; set; } = string.Empty;
        public List<MarketingHomepageBoostSlot> Slots { get; set; } = [];
    }

    public class MarketingTemplateItem
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string VariableHint { get; set; } = string.Empty;
    }

    public class MarketingSocialChannel
    {
        public string Id { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string AccentClassName { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
    }

    public class MarketingSocialSharingSettings
    {
        public bool AutoPostEnabled { get; set; }
        public string AutoPostMessage { get; set; } = string.Empty;
        public List<MarketingSocialChannel> Channels { get; set; } = [];
    }

    public class MarketingSettingsPayload
    {
        public MarketingSummarySection Summary { get; set; } = new();
        public List<MarketingEmailCampaignItem> EmailCampaigns { get; set; } = [];
        public List<MarketingSmsStatusItem> SmsStatuses { get; set; } = [];
        public MarketingHomepageBoostSection HomepageBoost { get; set; } = new();
        public List<MarketingTemplateItem> Templates { get; set; } = [];
        public MarketingSocialSharingSettings SocialSharing { get; set; } = new();
    }

    public class UpdateMarketingSettingsRequest : MarketingSettingsPayload
    {
    }

    public class MarketingSettingsResponse : MarketingSettingsPayload
    {
        public DateTime? UpdatedAt { get; set; }
    }

    public class MarketingSettingsService
    {
        private const int SettingsRecordId = 1;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
        {
            WriteIndented = false
        };

        private readonly AppDbContext _db;

        public MarketingSettingsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<MarketingSettingsResponse> GetAdminSettingsAsync()
        {
            var record = await _db.MarketingSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId);

            var content = record is null ? CreateEmptyPayload() : ReadPayload(record.ContentJson);
            var updatedAt = record?.UpdatedAt;

            return MapResponse(content, updatedAt);
        }

        public async Task<MarketingSettingsResponse> UpdateSettingsAsync(UpdateMarketingSettingsRequest request)
        {
            var payload = NormalizePayload(request);
            var now = DateTime.UtcNow;

            var record = await _db.MarketingSettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId);
            if (record is null)
            {
                record = new MarketingSettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.MarketingSettings.AddAsync(record);
            }

            record.ContentJson = JsonSerializer.Serialize(payload, JsonOptions);
            record.UpdatedAt = now;

            await _db.SaveChangesAsync();

            return MapResponse(payload, record.UpdatedAt);
        }

        private static MarketingSettingsResponse MapResponse(MarketingSettingsPayload payload, DateTime? updatedAt)
        {
            return new MarketingSettingsResponse
            {
                Summary = payload.Summary,
                EmailCampaigns = payload.EmailCampaigns,
                SmsStatuses = payload.SmsStatuses,
                HomepageBoost = payload.HomepageBoost,
                Templates = payload.Templates,
                SocialSharing = payload.SocialSharing,
                UpdatedAt = updatedAt,
            };
        }

        private static MarketingSettingsPayload ReadPayload(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return CreateEmptyPayload();
            }

            try
            {
                var payload = NormalizePayload(JsonSerializer.Deserialize<MarketingSettingsPayload>(json, JsonOptions));
                return ArePayloadsEquivalent(payload, NormalizePayload(CreateLegacySeedPayload()))
                    ? CreateEmptyPayload()
                    : payload;
            }
            catch
            {
                return CreateEmptyPayload();
            }
        }

        private static MarketingSettingsPayload NormalizePayload(MarketingSettingsPayload? input)
        {
            var defaults = CreateEmptyPayload();

            return new MarketingSettingsPayload
            {
                Summary = new MarketingSummarySection
                {
                    EmailOpenRate = NormalizeMetric(input?.Summary?.EmailOpenRate, defaults.Summary.EmailOpenRate),
                    SmsCtr = NormalizeMetric(input?.Summary?.SmsCtr, defaults.Summary.SmsCtr),
                    Conversions = NormalizeMetric(input?.Summary?.Conversions, defaults.Summary.Conversions),
                    SocialReach = NormalizeMetric(input?.Summary?.SocialReach, defaults.Summary.SocialReach),
                },
                EmailCampaigns = NormalizeEmailCampaigns(input?.EmailCampaigns),
                SmsStatuses = NormalizeSmsStatuses(input?.SmsStatuses),
                HomepageBoost = NormalizeHomepageBoost(input?.HomepageBoost, defaults.HomepageBoost),
                Templates = NormalizeTemplates(input?.Templates),
                SocialSharing = NormalizeSocialSharing(input?.SocialSharing, defaults.SocialSharing),
            };
        }

        private static MarketingSummaryMetric NormalizeMetric(MarketingSummaryMetric? input, MarketingSummaryMetric fallback)
        {
            return new MarketingSummaryMetric
            {
                Value = NormalizeLooseText(input?.Value, fallback.Value),
                DeltaLabel = NormalizeLooseText(input?.DeltaLabel, fallback.DeltaLabel),
                ProgressPercent = NormalizePercent(input?.ProgressPercent ?? fallback.ProgressPercent),
                TrendDirection = input?.TrendDirection ?? fallback.TrendDirection,
            };
        }

        private static List<MarketingEmailCampaignItem> NormalizeEmailCampaigns(
            IReadOnlyList<MarketingEmailCampaignItem>? items)
        {
            if (items is not { Count: > 0 })
            {
                return [];
            }

            return items
                .Select((item, index) => new MarketingEmailCampaignItem
                {
                    Id = NormalizeId(item.Id, $"email-campaign-{index + 1}"),
                    Name = NormalizeLooseText(item.Name),
                    Type = NormalizeLooseText(item.Type),
                    Status = NormalizeLooseText(item.Status),
                    PerformancePercent = NormalizePercent(item.PerformancePercent),
                })
                .ToList();
        }

        private static List<MarketingSmsStatusItem> NormalizeSmsStatuses(
            IReadOnlyList<MarketingSmsStatusItem>? items)
        {
            if (items is not { Count: > 0 })
            {
                return [];
            }

            return items
                .Select((item, index) => new MarketingSmsStatusItem
                {
                    Id = NormalizeId(item.Id, $"sms-status-{index + 1}"),
                    Title = NormalizeLooseText(item.Title),
                    RecipientCount = Math.Max(0, item.RecipientCount),
                    Status = NormalizeLooseText(item.Status),
                    LastActivityAt = item.LastActivityAt == default ? DateTime.UtcNow : item.LastActivityAt,
                })
                .ToList();
        }

        private static MarketingHomepageBoostSection NormalizeHomepageBoost(
            MarketingHomepageBoostSection? input,
            MarketingHomepageBoostSection fallback)
        {
            var sourceSlots = input?.Slots is { Count: > 0 } ? input.Slots : fallback.Slots;

            return new MarketingHomepageBoostSection
            {
                Title = NormalizeLooseText(input?.Title, fallback.Title),
                Description = NormalizeLooseText(input?.Description, fallback.Description),
                ButtonLabel = NormalizeLooseText(input?.ButtonLabel, fallback.ButtonLabel),
                Slots = sourceSlots
                    .Select((item, index) => new MarketingHomepageBoostSlot
                    {
                        Id = NormalizeId(item.Id, $"boost-slot-{index + 1}"),
                        PropertyId = item.PropertyId,
                        IsActive = item.IsActive,
                    })
                    .ToList(),
            };
        }

        private static List<MarketingTemplateItem> NormalizeTemplates(
            IReadOnlyList<MarketingTemplateItem>? items)
        {
            if (items is not { Count: > 0 })
            {
                return [];
            }

            return items
                .Select((item, index) => new MarketingTemplateItem
                {
                    Id = NormalizeId(item.Id, $"template-{index + 1}"),
                    Name = NormalizeLooseText(item.Name),
                    VariableHint = NormalizeLooseText(item.VariableHint),
                })
                .ToList();
        }

        private static MarketingSocialSharingSettings NormalizeSocialSharing(
            MarketingSocialSharingSettings? input,
            MarketingSocialSharingSettings fallback)
        {
            var sourceChannels = input?.Channels is { Count: > 0 } ? input.Channels : fallback.Channels;

            return new MarketingSocialSharingSettings
            {
                AutoPostEnabled = input?.AutoPostEnabled ?? fallback.AutoPostEnabled,
                AutoPostMessage = NormalizeLooseText(input?.AutoPostMessage, fallback.AutoPostMessage),
                Channels = sourceChannels
                    .Select((item, index) => new MarketingSocialChannel
                    {
                        Id = NormalizeId(item.Id, fallback.Channels.ElementAtOrDefault(index)?.Id ?? $"social-channel-{index + 1}"),
                        Label = NormalizeLooseText(item.Label, fallback.Channels.ElementAtOrDefault(index)?.Label ?? string.Empty),
                        Icon = NormalizeLooseText(item.Icon, fallback.Channels.ElementAtOrDefault(index)?.Icon ?? "share"),
                        AccentClassName = NormalizeLooseText(
                            item.AccentClassName,
                            fallback.Channels.ElementAtOrDefault(index)?.AccentClassName ?? "bg-slate-500"
                        ),
                        IsEnabled = item.IsEnabled,
                    })
                    .ToList(),
            };
        }

        private static string NormalizeLooseText(string? value, string fallback = "")
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string NormalizeId(string? value, string fallback)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static int NormalizePercent(int value)
        {
            return Math.Min(100, Math.Max(0, value));
        }

        private static bool ArePayloadsEquivalent(MarketingSettingsPayload left, MarketingSettingsPayload right)
        {
            return JsonSerializer.Serialize(left, JsonOptions) == JsonSerializer.Serialize(right, JsonOptions);
        }

        private static List<MarketingHomepageBoostSlot> CreateDefaultBoostSlots()
        {
            return
            [
                new MarketingHomepageBoostSlot
                {
                    Id = "boost-slot-1",
                    PropertyId = null,
                    IsActive = false,
                },
                new MarketingHomepageBoostSlot
                {
                    Id = "boost-slot-2",
                    PropertyId = null,
                    IsActive = false,
                }
            ];
        }

        private static List<MarketingSocialChannel> CreateDefaultSocialChannels(bool isEnabled)
        {
            return
            [
                new MarketingSocialChannel
                {
                    Id = "facebook",
                    Label = "Facebook",
                    Icon = "social_leaderboard",
                    AccentClassName = "bg-blue-600",
                    IsEnabled = isEnabled,
                },
                new MarketingSocialChannel
                {
                    Id = "twitter",
                    Label = "Twitter",
                    Icon = "share",
                    AccentClassName = "bg-sky-400",
                    IsEnabled = isEnabled,
                },
                new MarketingSocialChannel
                {
                    Id = "instagram",
                    Label = "Instagram",
                    Icon = "photo_camera",
                    AccentClassName = "bg-pink-600",
                    IsEnabled = isEnabled,
                },
                new MarketingSocialChannel
                {
                    Id = "linkedin",
                    Label = "LinkedIn",
                    Icon = "work",
                    AccentClassName = "bg-blue-800",
                    IsEnabled = isEnabled,
                }
            ];
        }

        private static MarketingSettingsPayload CreateEmptyPayload()
        {
            return new MarketingSettingsPayload
            {
                Summary = new MarketingSummarySection
                {
                    EmailOpenRate = new MarketingSummaryMetric(),
                    SmsCtr = new MarketingSummaryMetric(),
                    Conversions = new MarketingSummaryMetric(),
                    SocialReach = new MarketingSummaryMetric(),
                },
                EmailCampaigns = [],
                SmsStatuses = [],
                HomepageBoost = new MarketingHomepageBoostSection
                {
                    Title = string.Empty,
                    Description = string.Empty,
                    ButtonLabel = string.Empty,
                    Slots = CreateDefaultBoostSlots(),
                },
                Templates = [],
                SocialSharing = new MarketingSocialSharingSettings
                {
                    AutoPostEnabled = false,
                    AutoPostMessage = string.Empty,
                    Channels = CreateDefaultSocialChannels(false),
                },
            };
        }

        private static MarketingSettingsPayload CreateLegacySeedPayload()
        {
            var now = DateTime.UtcNow;

            return new MarketingSettingsPayload
            {
                Summary = new MarketingSummarySection
                {
                    EmailOpenRate = new MarketingSummaryMetric
                    {
                        Value = "24.5%",
                        DeltaLabel = "2.1%",
                        ProgressPercent = 25,
                        TrendDirection = MarketingTrendDirection.Up,
                    },
                    SmsCtr = new MarketingSummaryMetric
                    {
                        Value = "12.8%",
                        DeltaLabel = "0.5%",
                        ProgressPercent = 13,
                        TrendDirection = MarketingTrendDirection.Up,
                    },
                    Conversions = new MarketingSummaryMetric
                    {
                        Value = "86",
                        DeltaLabel = "12%",
                        ProgressPercent = 65,
                        TrendDirection = MarketingTrendDirection.Up,
                    },
                    SocialReach = new MarketingSummaryMetric
                    {
                        Value = "12.4k",
                        DeltaLabel = "Stable",
                        ProgressPercent = 45,
                        TrendDirection = MarketingTrendDirection.Stable,
                    },
                },
                EmailCampaigns =
                [
                    new MarketingEmailCampaignItem
                    {
                        Id = "monthly-newsletter-june",
                        Name = "Monthly Newsletter - June",
                        Type = "Newsletter",
                        Status = "Active",
                        PerformancePercent = 65,
                    },
                    new MarketingEmailCampaignItem
                    {
                        Id = "downtown-loft-alert",
                        Name = "Downtown Loft - New Alert",
                        Type = "Alert",
                        Status = "Sent",
                        PerformancePercent = 88,
                    },
                    new MarketingEmailCampaignItem
                    {
                        Id = "oak-st-open-house",
                        Name = "123 Oak St - Open House",
                        Type = "Invitation",
                        Status = "Scheduled",
                        PerformancePercent = 0,
                    }
                ],
                SmsStatuses =
                [
                    new MarketingSmsStatusItem
                    {
                        Id = "price-drop-alert",
                        Title = "Price Drop Alert",
                        RecipientCount = 425,
                        Status = "Success",
                        LastActivityAt = now.AddHours(-2),
                    },
                    new MarketingSmsStatusItem
                    {
                        Id = "showing-reminder",
                        Title = "Showing Reminder",
                        RecipientCount = 12,
                        Status = "Processing",
                        LastActivityAt = now,
                    }
                ],
                HomepageBoost = new MarketingHomepageBoostSection
                {
                    Title = "Homepage Boost",
                    Description = "Highlight top-tier properties on the main public portal.",
                    ButtonLabel = "Manage Boost Slots",
                    Slots =
                    [
                        new MarketingHomepageBoostSlot
                        {
                            Id = "boost-slot-1",
                            PropertyId = null,
                            IsActive = true,
                        },
                        new MarketingHomepageBoostSlot
                        {
                            Id = "boost-slot-2",
                            PropertyId = null,
                            IsActive = false,
                        }
                    ],
                },
                Templates =
                [
                    new MarketingTemplateItem
                    {
                        Id = "welcome-client",
                        Name = "Welcome Client",
                        VariableHint = "Uses: {{client_name}}",
                    },
                    new MarketingTemplateItem
                    {
                        Id = "new-property-alert",
                        Name = "New Property Alert",
                        VariableHint = "Uses: {{property_address}}",
                    },
                    new MarketingTemplateItem
                    {
                        Id = "tour-confirmation",
                        Name = "Tour Confirmation",
                        VariableHint = "Uses: {{tour_date}}",
                    }
                ],
                SocialSharing = new MarketingSocialSharingSettings
                {
                    AutoPostEnabled = true,
                    AutoPostMessage = "New listings are automatically shared to Facebook and Instagram.",
                    Channels = CreateDefaultSocialChannels(true),
                },
            };
        }
    }
}
