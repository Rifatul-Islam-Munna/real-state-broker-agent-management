using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Linq.Expressions;
using Data;
using Entities;
using MailKit.Net.Smtp;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Services
{
    public class UpdatePropertyFeedbackAutomationSettingsRequest
    {
        public bool OwnerReportEnabled { get; set; } = true;
        public FeedbackAutomationFrequency OwnerReportFrequency { get; set; } = FeedbackAutomationFrequency.Weekly;
        public int OwnerReportDayOfWeek { get; set; } = 1;
        public int OwnerReportDayOfMonth { get; set; } = 1;
        public int OwnerReportSendHourUtc { get; set; } = 8;
        public List<AgencyCommunicationChannel> OwnerReportChannels { get; set; } = [];
        public string OwnerReportSubject { get; set; } = string.Empty;
        public string OwnerReportBody { get; set; } = string.Empty;
        public bool FeedbackRequestEnabled { get; set; } = true;
        public int FeedbackRequestDelayHours { get; set; } = 2;
        public int FeedbackRequestFollowUpDelayHours { get; set; } = 24;
        public int FeedbackRequestMaxFollowUps { get; set; } = 2;
        public List<AgencyCommunicationChannel> FeedbackRequestChannels { get; set; } = [];
        public string FeedbackRequestSubject { get; set; } = string.Empty;
        public string FeedbackRequestBody { get; set; } = string.Empty;
        public bool AutoCaptureMailFeedback { get; set; } = true;
    }

    public record PropertyFeedbackAutomationSettingsResponse(
        bool OwnerReportEnabled,
        FeedbackAutomationFrequency OwnerReportFrequency,
        int OwnerReportDayOfWeek,
        int OwnerReportDayOfMonth,
        int OwnerReportSendHourUtc,
        List<AgencyCommunicationChannel> OwnerReportChannels,
        string OwnerReportSubject,
        string OwnerReportBody,
        bool FeedbackRequestEnabled,
        int FeedbackRequestDelayHours,
        int FeedbackRequestFollowUpDelayHours,
        int FeedbackRequestMaxFollowUps,
        List<AgencyCommunicationChannel> FeedbackRequestChannels,
        string FeedbackRequestSubject,
        string FeedbackRequestBody,
        bool AutoCaptureMailFeedback,
        DateTime? LastOwnerReportRunAt,
        DateTime UpdatedAt
    );

    public class CreateShowingFeedbackRequestInput
    {
        public int? ShowingBookingId { get; set; }
        public int PropertyId { get; set; }
        public int? LeadId { get; set; }
        public ShowingFeedbackRequestRecipientType RecipientType { get; set; } = ShowingFeedbackRequestRecipientType.ShowingAgent;
        public string RecipientName { get; set; } = string.Empty;
        public string RecipientEmail { get; set; } = string.Empty;
        public string RecipientPhone { get; set; } = string.Empty;
        public List<AgencyCommunicationChannel> Channels { get; set; } = [];
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime? ScheduledAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
    }

    public record ShowingFeedbackRequestResponse(
        int Id,
        int? ShowingBookingId,
        int PropertyId,
        string PropertyTitle,
        int? LeadId,
        string LeadName,
        ShowingFeedbackRequestRecipientType RecipientType,
        string RecipientName,
        string RecipientEmail,
        string RecipientPhone,
        List<AgencyCommunicationChannel> Channels,
        string Subject,
        string Message,
        ShowingFeedbackRequestStatus Status,
        DateTime ScheduledAt,
        DateTime? LastSentAt,
        DateTime? NextFollowUpAt,
        int FollowUpCount,
        int MaxFollowUps,
        DateTime? ReplyReceivedAt,
        string ReplySummary,
        string SkipReason,
        string CreatedBy,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public class SavePropertyVisitFeedbackInput
    {
        public int PropertyId { get; set; }
        public int? ShowingBookingId { get; set; }
        public int? LeadId { get; set; }
        public int? FeedbackRequestId { get; set; }
        public PropertyVisitFeedbackSource Source { get; set; } = PropertyVisitFeedbackSource.ManualEntry;
        public string ContactName { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string ContactPhone { get; set; } = string.Empty;
        public DateTime? FeedbackAt { get; set; }
        public PropertyFeedbackSentiment Sentiment { get; set; } = PropertyFeedbackSentiment.Unknown;
        public string Summary { get; set; } = string.Empty;
        public string FeedbackText { get; set; } = string.Empty;
        public List<string> Issues { get; set; } = [];
        public string CreatedBy { get; set; } = string.Empty;
    }

    public record PropertyVisitFeedbackResponse(
        int Id,
        int PropertyId,
        string PropertyTitle,
        int? ShowingBookingId,
        int? LeadId,
        string LeadName,
        int? FeedbackRequestId,
        PropertyVisitFeedbackSource Source,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        DateTime FeedbackAt,
        PropertyFeedbackSentiment Sentiment,
        string Summary,
        string FeedbackText,
        List<string> Issues,
        string CreatedBy,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public class PropertyFeedbackImportInput
    {
        public string BatchName { get; set; } = string.Empty;
        public Dictionary<string, string> FieldMappings { get; set; } = [];
        public List<Dictionary<string, string>> Rows { get; set; } = [];
        public string CreatedBy { get; set; } = string.Empty;
    }

    public class PropertyShowingImportInput
    {
        public string BatchName { get; set; } = string.Empty;
        public Dictionary<string, string> FieldMappings { get; set; } = [];
        public List<Dictionary<string, string>> Rows { get; set; } = [];
        public bool ScheduleFeedbackRequest { get; set; } = true;
        public string CreatedBy { get; set; } = string.Empty;
    }

    public record PropertyFeedbackImportResponse(
        string BatchName,
        int TotalRows,
        int SavedCount,
        int SkippedCount,
        int FailedCount,
        List<string> Failures
    );

    public record PropertyOwnerReportPropertySummaryResponse(
        int PropertyId,
        string PropertyTitle,
        string OwnerName,
        string OwnerEmail,
        string OwnerPhone,
        int NegativeCount,
        int MixedCount,
        int PositiveCount,
        DateTime? LatestFeedbackAt,
        List<string> TopIssues,
        DateTime? LastSentAt,
        string LastReportSummary
    );

    public record PropertyOwnerReportDispatchResponse(
        int Id,
        int PropertyId,
        string PropertyTitle,
        DateTime PeriodStart,
        DateTime PeriodEnd,
        List<AgencyCommunicationChannel> Channels,
        PropertyOwnerReportDispatchStatus Status,
        string Summary,
        string CreatedBy,
        DateTime? SentAt,
        DateTime CreatedAt
    );

    public record PropertyOwnerReportWorkspaceResponse(
        List<PropertyOwnerReportPropertySummaryResponse> Summaries,
        List<PropertyOwnerReportDispatchResponse> Dispatches
    );

    public class SendPropertyOwnerReportsInput
    {
        public int? PropertyId { get; set; }
        public List<int> PropertyIds { get; set; } = [];
        public List<AgencyCommunicationChannel> Channels { get; set; } = [];
        public string Subject { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
    }

    internal sealed record GenericDeliveryResult(
        bool Success,
        string Provider,
        string Summary
    );

    internal sealed record MailboxShowingFeedbackAnalysis(
        bool IsShowingFeedback,
        string PropertyName,
        PropertyFeedbackSentiment Sentiment,
        string Summary,
        List<string> Issues,
        string ContactName
    );

    public class PropertyFeedbackService
    {
        private const int SettingsId = 1;
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
        private static readonly Regex PhoneRegex = new(@"(?:\+?\d[\d\-\s\(\)]{7,}\d)", RegexOptions.Compiled);

        private readonly AgencyIntegrationWorkspaceService _agencyIntegrationWorkspaceService;
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;

        public PropertyFeedbackService(
            AppDbContext db,
            IHttpClientFactory httpClientFactory,
            AgencyIntegrationWorkspaceService agencyIntegrationWorkspaceService)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _agencyIntegrationWorkspaceService = agencyIntegrationWorkspaceService;
        }

        public async Task<PropertyFeedbackAutomationSettingsResponse> GetSettingsAsync(CancellationToken ct = default)
        {
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: false);
            return MapSettings(settings);
        }

        public async Task<PropertyFeedbackAutomationSettingsResponse> UpdateSettingsAsync(
            UpdatePropertyFeedbackAutomationSettingsRequest request,
            CancellationToken ct = default)
        {
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);
            settings.OwnerReportEnabled = request.OwnerReportEnabled;
            settings.OwnerReportFrequency = request.OwnerReportFrequency;
            settings.OwnerReportDayOfWeek = Math.Clamp(request.OwnerReportDayOfWeek, 0, 6);
            settings.OwnerReportDayOfMonth = Math.Clamp(request.OwnerReportDayOfMonth, 1, 28);
            settings.OwnerReportSendHourUtc = Math.Clamp(request.OwnerReportSendHourUtc, 0, 23);
            settings.OwnerReportChannels = NormalizeChannels(request.OwnerReportChannels, [AgencyCommunicationChannel.Email]);
            settings.OwnerReportSubject = NormalizeText(request.OwnerReportSubject, "Owner update for {{property_title}}");
            settings.OwnerReportBody = NormalizeText(request.OwnerReportBody, DefaultSettings().OwnerReportBody);
            settings.FeedbackRequestEnabled = request.FeedbackRequestEnabled;
            settings.FeedbackRequestDelayHours = Math.Clamp(request.FeedbackRequestDelayHours, 1, 120);
            settings.FeedbackRequestFollowUpDelayHours = Math.Clamp(request.FeedbackRequestFollowUpDelayHours, 1, 240);
            settings.FeedbackRequestMaxFollowUps = Math.Clamp(request.FeedbackRequestMaxFollowUps, 0, 5);
            settings.FeedbackRequestChannels = NormalizeChannels(request.FeedbackRequestChannels, [AgencyCommunicationChannel.Email]);
            settings.FeedbackRequestSubject = NormalizeText(request.FeedbackRequestSubject, DefaultSettings().FeedbackRequestSubject);
            settings.FeedbackRequestBody = NormalizeText(request.FeedbackRequestBody, DefaultSettings().FeedbackRequestBody);
            settings.AutoCaptureMailFeedback = request.AutoCaptureMailFeedback;
            settings.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            return MapSettings(settings);
        }

        public async Task<List<ShowingFeedbackRequestResponse>> GetFeedbackRequestsAsync(CancellationToken ct = default)
        {
            return await _db.ShowingFeedbackRequests
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Lead)
                .OrderBy(item => item.Status == ShowingFeedbackRequestStatus.Pending ? 0 : 1)
                .ThenBy(item => item.NextFollowUpAt ?? item.ScheduledAt)
                .ThenByDescending(item => item.CreatedAt)
                .Select(MapFeedbackRequest())
                .ToListAsync(ct);
        }

        public async Task<List<PropertyVisitFeedbackResponse>> GetFeedbackEntriesAsync(int? propertyId = null, CancellationToken ct = default)
        {
            var query = _db.PropertyVisitFeedbackItems
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Lead)
                .AsQueryable();

            if (propertyId.HasValue)
            {
                query = query.Where(item => item.PropertyId == propertyId.Value);
            }

            return await query
                .OrderByDescending(item => item.FeedbackAt)
                .ThenByDescending(item => item.Id)
                .Select(MapFeedback())
                .ToListAsync(ct);
        }

        public async Task<ShowingFeedbackRequestResponse> CreateFeedbackRequestAsync(
            CreateShowingFeedbackRequestInput input,
            CancellationToken ct = default)
        {
            var property = await _db.Properties.AsNoTracking().FirstOrDefaultAsync(item => item.Id == input.PropertyId, ct)
                ?? throw new InvalidOperationException("Property was not found.");

            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);
            var now = DateTime.UtcNow;
            var scheduledAt = input.ScheduledAt?.ToUniversalTime() ?? now.AddHours(settings.FeedbackRequestDelayHours);
            var request = new ShowingFeedbackRequest
            {
                ShowingBookingId = input.ShowingBookingId,
                PropertyId = input.PropertyId,
                LeadId = input.LeadId,
                RecipientType = input.RecipientType,
                RecipientName = NormalizeLooseText(input.RecipientName),
                RecipientEmail = NormalizeLooseText(input.RecipientEmail).ToLowerInvariant(),
                RecipientPhone = NormalizeLooseText(input.RecipientPhone),
                Channels = NormalizeChannels(input.Channels, settings.FeedbackRequestChannels),
                Subject = NormalizeText(input.Subject, ApplyTokens(settings.FeedbackRequestSubject, property, null, input.RecipientName, scheduledAt, [])),
                Message = NormalizeText(input.Message, ApplyTokens(settings.FeedbackRequestBody, property, null, input.RecipientName, scheduledAt, [])),
                Status = ShowingFeedbackRequestStatus.Pending,
                ScheduledAt = scheduledAt,
                NextFollowUpAt = scheduledAt,
                MaxFollowUps = settings.FeedbackRequestMaxFollowUps,
                CreatedBy = NormalizeText(input.CreatedBy, "CRM"),
                CreatedAt = now,
                UpdatedAt = now,
            };

            await _db.ShowingFeedbackRequests.AddAsync(request, ct);
            await _db.SaveChangesAsync(ct);
            return await _db.ShowingFeedbackRequests
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Lead)
                .Where(item => item.Id == request.Id)
                .Select(MapFeedbackRequest())
                .FirstAsync(ct);
        }

        public async Task<PropertyVisitFeedbackResponse> SaveFeedbackAsync(
            SavePropertyVisitFeedbackInput input,
            CancellationToken ct = default)
        {
            var property = await _db.Properties.AsNoTracking().FirstOrDefaultAsync(item => item.Id == input.PropertyId, ct)
                ?? throw new InvalidOperationException("Property was not found.");

            var feedbackAt = input.FeedbackAt?.ToUniversalTime() ?? DateTime.UtcNow;
            var entry = new PropertyVisitFeedback
            {
                PropertyId = property.Id,
                ShowingBookingId = input.ShowingBookingId,
                LeadId = input.LeadId,
                FeedbackRequestId = input.FeedbackRequestId,
                Source = input.Source,
                ContactName = NormalizeLooseText(input.ContactName),
                ContactEmail = NormalizeLooseText(input.ContactEmail).ToLowerInvariant(),
                ContactPhone = NormalizeLooseText(input.ContactPhone),
                FeedbackAt = feedbackAt,
                Sentiment = input.Sentiment,
                Summary = NormalizeText(input.Summary, BuildSummary(input.FeedbackText)),
                FeedbackText = NormalizeText(input.FeedbackText, input.Summary),
                Issues = NormalizeIssues(input.Issues),
                CreatedBy = NormalizeText(input.CreatedBy, "Admin"),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

            await _db.PropertyVisitFeedbackItems.AddAsync(entry, ct);

            if (input.ShowingBookingId.HasValue)
            {
                var showing = await _db.ShowingBookings.FirstOrDefaultAsync(item => item.Id == input.ShowingBookingId.Value, ct);
                if (showing is not null)
                {
                    showing.FeedbackReceivedAt = feedbackAt;
                    showing.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (input.FeedbackRequestId.HasValue)
            {
                var request = await _db.ShowingFeedbackRequests.FirstOrDefaultAsync(item => item.Id == input.FeedbackRequestId.Value, ct);
                if (request is not null)
                {
                    request.Status = ShowingFeedbackRequestStatus.Replied;
                    request.ReplyReceivedAt = feedbackAt;
                    request.ReplySummary = entry.Summary;
                    request.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync(ct);

            return await _db.PropertyVisitFeedbackItems
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Lead)
                .Where(item => item.Id == entry.Id)
                .Select(MapFeedback())
                .FirstAsync(ct);
        }

        public async Task<PropertyFeedbackImportResponse> ImportFeedbackAsync(
            PropertyFeedbackImportInput input,
            CancellationToken ct = default)
        {
            var failures = new List<string>();
            var savedCount = 0;
            var skippedCount = 0;

            for (var index = 0; index < input.Rows.Count; index++)
            {
                var row = input.Rows[index];
                try
                {
                    var property = await ResolvePropertyAsync(row, input.FieldMappings, ct);
                    if (property is null)
                    {
                        skippedCount++;
                        failures.Add($"Row {index + 1}: property not found.");
                        continue;
                    }

                    var feedbackText = ReadMapped(row, input.FieldMappings, "feedbackText", "feedback", "message");
                    var summary = ReadMapped(row, input.FieldMappings, "summary");
                    if (string.IsNullOrWhiteSpace(feedbackText) && string.IsNullOrWhiteSpace(summary))
                    {
                        skippedCount++;
                        continue;
                    }

                    var lead = await ResolveLeadAsync(row, input.FieldMappings, ct);
                    var showing = await ResolveShowingAsync(property.Id, lead?.Id, row, input.FieldMappings, ct);
                    await SaveFeedbackAsync(new SavePropertyVisitFeedbackInput
                    {
                        PropertyId = property.Id,
                        ShowingBookingId = showing?.Id,
                        LeadId = lead?.Id,
                        Source = PropertyVisitFeedbackSource.CsvImport,
                        ContactName = ReadMapped(row, input.FieldMappings, "contactName", "name"),
                        ContactEmail = ReadMapped(row, input.FieldMappings, "contactEmail", "email"),
                        ContactPhone = ReadMapped(row, input.FieldMappings, "contactPhone", "phone"),
                        FeedbackAt = ParseDate(ReadMapped(row, input.FieldMappings, "feedbackAt", "date")),
                        Sentiment = ParseSentiment(ReadMapped(row, input.FieldMappings, "sentiment")),
                        Summary = summary,
                        FeedbackText = feedbackText,
                        Issues = SplitTokens(ReadMapped(row, input.FieldMappings, "issues", "issueList")),
                        CreatedBy = NormalizeText(input.CreatedBy, "Admin"),
                    }, ct);
                    savedCount++;
                }
                catch (Exception ex)
                {
                    failures.Add($"Row {index + 1}: {ex.Message}");
                }
            }

            return new PropertyFeedbackImportResponse(
                NormalizeText(input.BatchName, "Feedback Import"),
                input.Rows.Count,
                savedCount,
                skippedCount,
                failures.Count,
                failures);
        }

        public async Task<PropertyFeedbackImportResponse> ImportShowingsAsync(
            PropertyShowingImportInput input,
            CancellationToken ct = default)
        {
            var failures = new List<string>();
            var savedCount = 0;
            var skippedCount = 0;
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);

            for (var index = 0; index < input.Rows.Count; index++)
            {
                var row = input.Rows[index];
                try
                {
                    var property = await ResolvePropertyAsync(row, input.FieldMappings, ct);
                    if (property is null)
                    {
                        skippedCount++;
                        failures.Add($"Row {index + 1}: property not found.");
                        continue;
                    }

                    var startAt = ParseDate(ReadMapped(row, input.FieldMappings, "startAt", "showingTime", "date"));
                    if (!startAt.HasValue)
                    {
                        skippedCount++;
                        failures.Add($"Row {index + 1}: showing date missing.");
                        continue;
                    }

                    var lead = await ResolveLeadAsync(row, input.FieldMappings, ct);
                    if (lead is null)
                    {
                        lead = await CreateImportedLeadAsync(property, row, input.FieldMappings, input.CreatedBy, startAt.Value, ct);
                    }

                    var showing = new ShowingBooking
                    {
                        LeadId = lead.Id,
                        PropertyId = property.Id,
                        AgentId = lead.AgentId ?? property.AgentId,
                        ContactName = NormalizeText(ReadMapped(row, input.FieldMappings, "contactName", "name"), lead.Name),
                        ContactEmail = NormalizeText(ReadMapped(row, input.FieldMappings, "contactEmail", "email"), lead.Email).ToLowerInvariant(),
                        ContactPhone = NormalizeText(ReadMapped(row, input.FieldMappings, "contactPhone", "phone"), lead.Phone),
                        StartAt = startAt.Value,
                        EndAt = ParseDate(ReadMapped(row, input.FieldMappings, "endAt")) ?? startAt.Value.AddMinutes(45),
                        Status = ParseShowingStatus(ReadMapped(row, input.FieldMappings, "status")),
                        Notes = NormalizeLooseText(ReadMapped(row, input.FieldMappings, "notes")),
                        ShowingAgentName = NormalizeText(ReadMapped(row, input.FieldMappings, "showingAgentName", "brokerName"), lead.ShowingAgentName),
                        ShowingAgentEmail = NormalizeText(ReadMapped(row, input.FieldMappings, "showingAgentEmail", "brokerEmail"), lead.ShowingAgentEmail).ToLowerInvariant(),
                        ShowingAgentPhone = NormalizeText(ReadMapped(row, input.FieldMappings, "showingAgentPhone", "brokerPhone"), lead.ShowingAgentPhone),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };

                    await _db.ShowingBookings.AddAsync(showing, ct);
                    await _db.SaveChangesAsync(ct);
                    savedCount++;

                    if (input.ScheduleFeedbackRequest && settings.FeedbackRequestEnabled)
                    {
                        var recipientName = NormalizeText(showing.ShowingAgentName, lead.ShowingAgentName);
                        var recipientEmail = NormalizeText(showing.ShowingAgentEmail, lead.ShowingAgentEmail);
                        var recipientPhone = NormalizeText(showing.ShowingAgentPhone, lead.ShowingAgentPhone);
                        if (!string.IsNullOrWhiteSpace(recipientEmail) || !string.IsNullOrWhiteSpace(recipientPhone))
                        {
                            await CreateFeedbackRequestAsync(new CreateShowingFeedbackRequestInput
                            {
                                ShowingBookingId = showing.Id,
                                PropertyId = property.Id,
                                LeadId = lead.Id,
                                RecipientType = ShowingFeedbackRequestRecipientType.ShowingAgent,
                                RecipientName = recipientName,
                                RecipientEmail = recipientEmail,
                                RecipientPhone = recipientPhone,
                                Channels = settings.FeedbackRequestChannels,
                                Subject = ApplyTokens(settings.FeedbackRequestSubject, property, lead, recipientName, showing.StartAt, []),
                                Message = ApplyTokens(settings.FeedbackRequestBody, property, lead, recipientName, showing.StartAt, []),
                                ScheduledAt = showing.StartAt.AddHours(settings.FeedbackRequestDelayHours),
                                CreatedBy = NormalizeText(input.CreatedBy, "Admin"),
                            }, ct);
                        }
                    }
                }
                catch (Exception ex)
                {
                    failures.Add($"Row {index + 1}: {ex.Message}");
                }
            }

            return new PropertyFeedbackImportResponse(
                NormalizeText(input.BatchName, "Showing Import"),
                input.Rows.Count,
                savedCount,
                skippedCount,
                failures.Count,
                failures);
        }

        public async Task<PropertyOwnerReportWorkspaceResponse> GetOwnerReportWorkspaceAsync(CancellationToken ct = default)
        {
            var summaries = await BuildOwnerSummariesAsync(ct);
            var dispatches = await _db.PropertyOwnerReportDispatches
                .AsNoTracking()
                .Include(item => item.Property)
                .OrderByDescending(item => item.CreatedAt)
                .Take(40)
                .Select(item => new PropertyOwnerReportDispatchResponse(
                    item.Id,
                    item.PropertyId,
                    item.Property == null ? $"Property #{item.PropertyId}" : item.Property.Title,
                    item.PeriodStart,
                    item.PeriodEnd,
                    item.Channels,
                    item.Status,
                    item.Summary,
                    item.CreatedBy,
                    item.SentAt,
                    item.CreatedAt))
                .ToListAsync(ct);

            return new PropertyOwnerReportWorkspaceResponse(summaries, dispatches);
        }

        public async Task<PropertyFeedbackImportResponse> SendOwnerReportsNowAsync(
            SendPropertyOwnerReportsInput input,
            CancellationToken ct = default)
        {
            return await SendOwnerReportsCoreAsync(
                input.PropertyId,
                input.PropertyIds,
                NormalizeChannels(input.Channels, []),
                NormalizeLooseText(input.Subject),
                NormalizeLooseText(input.Body),
                NormalizeText(input.CreatedBy, "Admin"),
                ct);
        }

        public async Task ProcessDueAsync(CancellationToken ct = default)
        {
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);
            var now = DateTime.UtcNow;

            if (settings.FeedbackRequestEnabled)
            {
                var dueRequests = await _db.ShowingFeedbackRequests
                    .Include(item => item.Property)
                    .Include(item => item.Lead)
                    .Where(item =>
                        (item.Status == ShowingFeedbackRequestStatus.Pending || item.Status == ShowingFeedbackRequestStatus.Sent) &&
                        (item.NextFollowUpAt ?? item.ScheduledAt) <= now)
                    .OrderBy(item => item.NextFollowUpAt ?? item.ScheduledAt)
                    .Take(25)
                    .ToListAsync(ct);

                foreach (var request in dueRequests)
                {
                    var skipReason = await BuildReplySkipReasonAsync(request, ct);
                    if (!string.IsNullOrWhiteSpace(skipReason))
                    {
                        request.Status = ShowingFeedbackRequestStatus.Replied;
                        request.ReplyReceivedAt = now;
                        request.ReplySummary = skipReason;
                        request.UpdatedAt = now;
                        continue;
                    }

                    if (request.Property is null)
                    {
                        request.Status = ShowingFeedbackRequestStatus.Failed;
                        request.SkipReason = "Property missing.";
                        request.UpdatedAt = now;
                        continue;
                    }

                    var delivery = await DeliverChannelsAsync(
                        request.Channels,
                        request.RecipientEmail,
                        request.RecipientPhone,
                        request.Subject,
                        request.Message,
                        ct);

                    request.Status = delivery.Success ? ShowingFeedbackRequestStatus.Sent : ShowingFeedbackRequestStatus.Failed;
                    request.SkipReason = delivery.Success ? string.Empty : delivery.Summary;
                    request.LastSentAt = now;
                    request.FollowUpCount += 1;
                    request.UpdatedAt = now;
                    request.NextFollowUpAt = delivery.Success && request.FollowUpCount <= request.MaxFollowUps
                        ? now.AddHours(settings.FeedbackRequestFollowUpDelayHours)
                        : null;

                    if (request.ShowingBookingId.HasValue)
                    {
                        var showing = await _db.ShowingBookings.FirstOrDefaultAsync(item => item.Id == request.ShowingBookingId.Value, ct);
                        if (showing is not null)
                        {
                            showing.FeedbackRequestedAt = now;
                            showing.UpdatedAt = now;
                        }
                    }
                }
            }

            if (settings.OwnerReportEnabled && IsOwnerReportDue(settings, now))
            {
                await SendOwnerReportsCoreAsync(null, [], [], string.Empty, string.Empty, "System", ct);
                settings.LastOwnerReportRunAt = now;
                settings.UpdatedAt = now;
            }

            await _db.SaveChangesAsync(ct);
        }

        public async Task<bool> TryCaptureMailboxFeedbackAsync(
            MailboxInboundEmail email,
            AiWorkspaceWriteRequest? aiConfig,
            DateTime receivedAt,
            CancellationToken ct = default)
        {
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);
            if (!settings.AutoCaptureMailFeedback)
            {
                return false;
            }

            var propertyTitles = await _db.Properties
                .AsNoTracking()
                .OrderByDescending(item => item.UpdatedAt)
                .Select(item => item.Title)
                .ToListAsync(ct);

            var analysis = await AnalyzeMailboxFeedbackAsync(aiConfig, email, propertyTitles, ct);
            if (!analysis.IsShowingFeedback)
            {
                return false;
            }

            var property = await _db.Properties
                .AsNoTracking()
                .OrderByDescending(item => item.UpdatedAt)
                .FirstOrDefaultAsync(item => item.Title == analysis.PropertyName, ct);

            if (property is null)
            {
                property = await _db.Properties
                    .AsNoTracking()
                    .OrderByDescending(item => item.UpdatedAt)
                    .FirstOrDefaultAsync(item =>
                        !string.IsNullOrWhiteSpace(item.Title) &&
                        $"{email.Subject}\n{email.Body}".ToLowerInvariant().Contains(item.Title.ToLower()), ct);
            }

            if (property is null)
            {
                return false;
            }

            var normalizedEmail = NormalizeLooseText(email.SenderEmail).ToLowerInvariant();
            var lead = await _db.Leads.FirstOrDefaultAsync(item => item.Email == normalizedEmail, ct);
            var showing = await _db.ShowingBookings
                .OrderByDescending(item => item.StartAt)
                .FirstOrDefaultAsync(item =>
                    item.PropertyId == property.Id &&
                    (
                        item.ContactEmail == normalizedEmail ||
                        item.ShowingAgentEmail == normalizedEmail ||
                        item.ContactPhone == DetectPhone(email.Body) ||
                        item.ShowingAgentPhone == DetectPhone(email.Body)
                    ), ct);

            if (await _db.PropertyVisitFeedbackItems.AnyAsync(item =>
                item.PropertyId == property.Id &&
                item.ContactEmail == normalizedEmail &&
                item.Summary == analysis.Summary &&
                item.FeedbackAt >= receivedAt.AddMinutes(-5) &&
                item.FeedbackAt <= receivedAt.AddMinutes(5), ct))
            {
                return false;
            }

            var request = await _db.ShowingFeedbackRequests
                .OrderByDescending(item => item.CreatedAt)
                .FirstOrDefaultAsync(item =>
                    item.PropertyId == property.Id &&
                    (item.RecipientEmail == normalizedEmail ||
                     (!string.IsNullOrWhiteSpace(item.RecipientPhone) && item.RecipientPhone == DetectPhone(email.Body))), ct);

            await SaveFeedbackAsync(new SavePropertyVisitFeedbackInput
            {
                PropertyId = property.Id,
                ShowingBookingId = showing?.Id,
                LeadId = lead?.Id ?? showing?.LeadId,
                FeedbackRequestId = request?.Id,
                Source = PropertyVisitFeedbackSource.MailboxAi,
                ContactName = NormalizeText(analysis.ContactName, email.SenderName),
                ContactEmail = normalizedEmail,
                ContactPhone = DetectPhone(email.Body),
                FeedbackAt = receivedAt,
                Sentiment = analysis.Sentiment,
                Summary = analysis.Summary,
                FeedbackText = email.Body,
                Issues = analysis.Issues,
                CreatedBy = "Mailbox AI",
            }, ct);

            return true;
        }

        private async Task<PropertyFeedbackImportResponse> SendOwnerReportsCoreAsync(
            int? propertyId,
            List<int>? propertyIds,
            List<AgencyCommunicationChannel>? channelsOverride,
            string subjectOverride,
            string bodyOverride,
            string createdBy,
            CancellationToken ct)
        {
            var settings = await GetOrCreateSettingsEntityAsync(ct, persistIfMissing: true);
            var failures = new List<string>();
            var summaries = await BuildOwnerSummariesAsync(ct);
            var selectedIds = (propertyIds ?? []).Where(item => item > 0).Distinct().ToHashSet();
            var filtered = propertyId.HasValue
                ? summaries.Where(item => item.PropertyId == propertyId.Value).ToList()
                : selectedIds.Count > 0
                    ? summaries.Where(item => selectedIds.Contains(item.PropertyId)).ToList()
                    : summaries;
            var periodEnd = DateTime.UtcNow;
            var periodStart = settings.OwnerReportFrequency == FeedbackAutomationFrequency.Weekly
                ? periodEnd.AddDays(-7)
                : periodEnd.AddDays(-30);
            var savedCount = 0;
            var skippedCount = 0;
            var finalChannels = NormalizeChannels(channelsOverride, settings.OwnerReportChannels);

            foreach (var summary in filtered)
            {
                if (summary.NegativeCount == 0 && summary.MixedCount == 0)
                {
                    skippedCount++;
                    await SaveOwnerDispatchAsync(summary.PropertyId, periodStart, periodEnd, finalChannels,
                        PropertyOwnerReportDispatchStatus.Skipped, "No negative or mixed feedback in this period.", string.Empty, string.Empty, createdBy, null, ct);
                    continue;
                }

                if (string.IsNullOrWhiteSpace(summary.OwnerEmail) && string.IsNullOrWhiteSpace(summary.OwnerPhone))
                {
                    skippedCount++;
                    await SaveOwnerDispatchAsync(summary.PropertyId, periodStart, periodEnd, finalChannels,
                        PropertyOwnerReportDispatchStatus.Skipped, "Owner contact missing.", string.Empty, string.Empty, createdBy, null, ct);
                    continue;
                }

                var property = await _db.Properties.AsNoTracking().FirstAsync(item => item.Id == summary.PropertyId, ct);
                var recentFeedback = await _db.PropertyVisitFeedbackItems
                    .AsNoTracking()
                    .Where(item => item.PropertyId == summary.PropertyId && item.FeedbackAt >= periodStart && item.FeedbackAt <= periodEnd)
                    .OrderByDescending(item => item.FeedbackAt)
                    .Take(8)
                    .ToListAsync(ct);
                var topIssues = summary.TopIssues.Count == 0 ? ["Low engagement needs review"] : summary.TopIssues;
                var summaryText = BuildOwnerFeedbackSummary(recentFeedback, topIssues);
                var bodyTemplate = string.IsNullOrWhiteSpace(bodyOverride) ? settings.OwnerReportBody : bodyOverride;
                var subjectTemplate = string.IsNullOrWhiteSpace(subjectOverride) ? settings.OwnerReportSubject : subjectOverride;
                var body = ApplyOwnerReportTokens(bodyTemplate, property, summaryText, topIssues, settings.OwnerReportFrequency);
                var subject = ApplyOwnerReportTokens(subjectTemplate, property, summaryText, topIssues, settings.OwnerReportFrequency);
                var delivery = await DeliverChannelsAsync(finalChannels, summary.OwnerEmail, summary.OwnerPhone, subject, body, ct);
                var status = delivery.Success ? PropertyOwnerReportDispatchStatus.Sent : PropertyOwnerReportDispatchStatus.Failed;
                await SaveOwnerDispatchAsync(summary.PropertyId, periodStart, periodEnd, finalChannels, status, delivery.Summary, subject, body, createdBy, delivery.Success ? DateTime.UtcNow : null, ct);

                if (delivery.Success)
                {
                    savedCount++;
                }
                else
                {
                    failures.Add($"{summary.PropertyTitle}: {delivery.Summary}");
                }
            }

            return new PropertyFeedbackImportResponse(
                propertyId.HasValue ? "Owner Report Send" : "Owner Reports Send",
                filtered.Count,
                savedCount,
                skippedCount,
                failures.Count,
                failures);
        }

        private async Task SaveOwnerDispatchAsync(
            int propertyId,
            DateTime periodStart,
            DateTime periodEnd,
            List<AgencyCommunicationChannel> channels,
            PropertyOwnerReportDispatchStatus status,
            string summary,
            string subject,
            string body,
            string createdBy,
            DateTime? sentAt,
            CancellationToken ct)
        {
            await _db.PropertyOwnerReportDispatches.AddAsync(new PropertyOwnerReportDispatch
            {
                PropertyId = propertyId,
                PeriodStart = periodStart,
                PeriodEnd = periodEnd,
                Channels = channels,
                Status = status,
                Summary = summary,
                Subject = subject,
                Body = body,
                CreatedBy = createdBy,
                SentAt = sentAt,
                CreatedAt = DateTime.UtcNow,
            }, ct);
            await _db.SaveChangesAsync(ct);
        }

        private async Task<List<PropertyOwnerReportPropertySummaryResponse>> BuildOwnerSummariesAsync(CancellationToken ct)
        {
            var periodStart = DateTime.UtcNow.AddDays(-30);
            var feedback = await _db.PropertyVisitFeedbackItems
                .AsNoTracking()
                .Include(item => item.Property)
                .Where(item => item.FeedbackAt >= periodStart)
                .ToListAsync(ct);
            var lastDispatchMap = await _db.PropertyOwnerReportDispatches
                .AsNoTracking()
                .GroupBy(item => item.PropertyId)
                .Select(group => new
                {
                    PropertyId = group.Key,
                    LastSentAt = group.Max(item => item.SentAt),
                    LastSummary = group.OrderByDescending(item => item.CreatedAt).Select(item => item.Summary).FirstOrDefault(),
                })
                .ToDictionaryAsync(item => item.PropertyId, ct);

            return feedback
                .GroupBy(item => item.PropertyId)
                .Select(group =>
                {
                    var property = group.First().Property!;
                    var issues = group
                        .SelectMany(item => item.Issues ?? [])
                        .Where(item => !string.IsNullOrWhiteSpace(item))
                        .GroupBy(item => item.Trim(), StringComparer.OrdinalIgnoreCase)
                        .OrderByDescending(item => item.Count())
                        .ThenBy(item => item.Key)
                        .Take(5)
                        .Select(item => item.Key)
                        .ToList();
                    var lastDispatch = lastDispatchMap.TryGetValue(group.Key, out var value) ? value : null;

                    return new PropertyOwnerReportPropertySummaryResponse(
                        group.Key,
                        property.Title,
                        property.OwnerName,
                        property.OwnerEmail,
                        property.OwnerPhone,
                        group.Count(item => item.Sentiment == PropertyFeedbackSentiment.Negative),
                        group.Count(item => item.Sentiment == PropertyFeedbackSentiment.Mixed),
                        group.Count(item => item.Sentiment == PropertyFeedbackSentiment.Positive),
                        group.Max(item => (DateTime?)item.FeedbackAt),
                        issues,
                        lastDispatch?.LastSentAt,
                        lastDispatch?.LastSummary ?? string.Empty);
                })
                .OrderByDescending(item => item.NegativeCount)
                .ThenBy(item => item.PropertyTitle)
                .ToList();
        }

        private async Task<PropertyFeedbackAutomationSettings> GetOrCreateSettingsEntityAsync(CancellationToken ct, bool persistIfMissing)
        {
            var settings = await _db.PropertyFeedbackAutomationSettings.FirstOrDefaultAsync(item => item.Id == SettingsId, ct);
            if (settings is not null)
            {
                return settings;
            }

            settings = DefaultSettings();
            if (persistIfMissing)
            {
                await _db.PropertyFeedbackAutomationSettings.AddAsync(settings, ct);
                await _db.SaveChangesAsync(ct);
            }

            return settings;
        }

        private static PropertyFeedbackAutomationSettingsResponse MapSettings(PropertyFeedbackAutomationSettings settings)
        {
            return new PropertyFeedbackAutomationSettingsResponse(
                settings.OwnerReportEnabled,
                settings.OwnerReportFrequency,
                settings.OwnerReportDayOfWeek,
                settings.OwnerReportDayOfMonth,
                settings.OwnerReportSendHourUtc,
                settings.OwnerReportChannels,
                settings.OwnerReportSubject,
                settings.OwnerReportBody,
                settings.FeedbackRequestEnabled,
                settings.FeedbackRequestDelayHours,
                settings.FeedbackRequestFollowUpDelayHours,
                settings.FeedbackRequestMaxFollowUps,
                settings.FeedbackRequestChannels,
                settings.FeedbackRequestSubject,
                settings.FeedbackRequestBody,
                settings.AutoCaptureMailFeedback,
                settings.LastOwnerReportRunAt,
                settings.UpdatedAt);
        }

        private static Expression<Func<ShowingFeedbackRequest, ShowingFeedbackRequestResponse>> MapFeedbackRequest()
        {
            return item => new ShowingFeedbackRequestResponse(
                item.Id,
                item.ShowingBookingId,
                item.PropertyId,
                item.Property == null ? $"Property #{item.PropertyId}" : item.Property.Title,
                item.LeadId,
                item.Lead == null ? string.Empty : item.Lead.Name,
                item.RecipientType,
                item.RecipientName,
                item.RecipientEmail,
                item.RecipientPhone,
                item.Channels,
                item.Subject,
                item.Message,
                item.Status,
                item.ScheduledAt,
                item.LastSentAt,
                item.NextFollowUpAt,
                item.FollowUpCount,
                item.MaxFollowUps,
                item.ReplyReceivedAt,
                item.ReplySummary,
                item.SkipReason,
                item.CreatedBy,
                item.CreatedAt,
                item.UpdatedAt);
        }

        private static Expression<Func<PropertyVisitFeedback, PropertyVisitFeedbackResponse>> MapFeedback()
        {
            return item => new PropertyVisitFeedbackResponse(
                item.Id,
                item.PropertyId,
                item.Property == null ? $"Property #{item.PropertyId}" : item.Property.Title,
                item.ShowingBookingId,
                item.LeadId,
                item.Lead == null ? string.Empty : item.Lead.Name,
                item.FeedbackRequestId,
                item.Source,
                item.ContactName,
                item.ContactEmail,
                item.ContactPhone,
                item.FeedbackAt,
                item.Sentiment,
                item.Summary,
                item.FeedbackText,
                item.Issues,
                item.CreatedBy,
                item.CreatedAt,
                item.UpdatedAt);
        }

        private async Task<MailboxShowingFeedbackAnalysis> AnalyzeMailboxFeedbackAsync(
            AiWorkspaceWriteRequest? config,
            MailboxInboundEmail email,
            IReadOnlyCollection<string> propertyTitles,
            CancellationToken ct)
        {
            if (config is null || string.IsNullOrWhiteSpace(config.Model))
            {
                return AnalyzeMailboxFeedbackFallback(email, propertyTitles);
            }

            try
            {
                var prompt = BuildFeedbackPrompt(email, propertyTitles);
                var content = await RequestAnalysisContentAsync(config, prompt, ct);
                var parsed = JsonSerializer.Deserialize<FeedbackAnalysisResponse>(ExtractJson(content), JsonOptions) ?? new FeedbackAnalysisResponse();
                return new MailboxShowingFeedbackAnalysis(
                    parsed.IsShowingFeedback,
                    NormalizeText(parsed.PropertyName, FindPropertyTitle(propertyTitles, $"{email.Subject}\n{email.Body}") ?? string.Empty),
                    ParseSentiment(parsed.Sentiment),
                    NormalizeText(parsed.Summary, BuildSummary(email.Body)),
                    NormalizeIssues(parsed.Issues ?? []),
                    NormalizeText(parsed.ContactName, email.SenderName));
            }
            catch
            {
                return AnalyzeMailboxFeedbackFallback(email, propertyTitles);
            }
        }

        private static MailboxShowingFeedbackAnalysis AnalyzeMailboxFeedbackFallback(
            MailboxInboundEmail email,
            IReadOnlyCollection<string> propertyTitles)
        {
            var text = $"{email.Subject}\n{email.Body}";
            var normalized = text.ToLowerInvariant();
            var isFeedback =
                normalized.Contains("feedback") ||
                normalized.Contains("showing") ||
                normalized.Contains("tour") ||
                normalized.Contains("visit") ||
                normalized.Contains("too expensive") ||
                normalized.Contains("not interested") ||
                normalized.Contains("small") ||
                normalized.Contains("parking") ||
                normalized.Contains("location");
            var issues = new List<string>();
            AddIssueIfContains(issues, normalized, "price", "Price resistance");
            AddIssueIfContains(issues, normalized, "location", "Location objection");
            AddIssueIfContains(issues, normalized, "parking", "Parking concern");
            AddIssueIfContains(issues, normalized, "small", "Space feels small");
            AddIssueIfContains(issues, normalized, "condition", "Property condition concern");

            return new MailboxShowingFeedbackAnalysis(
                isFeedback,
                FindPropertyTitle(propertyTitles, text) ?? string.Empty,
                DetectSentiment(normalized),
                BuildSummary(text),
                issues,
                NormalizeText(email.SenderName, NameFromEmail(email.SenderEmail)));
        }

        private async Task<string> RequestAnalysisContentAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var providerName = NormalizeLooseText(config.ProviderName).ToLowerInvariant();
            return providerName == "ollama"
                ? await RequestOllamaAnalysisAsync(config, prompt, ct)
                : await RequestOpenAiCompatibleAnalysisAsync(config, prompt, ct);
        }

        private async Task<string> RequestOpenAiCompatibleAnalysisAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var baseUrl = NormalizeBaseUrl(config.BaseUrl, "https://api.openai.com/v1");
            using var client = _httpClientFactory.CreateClient(nameof(PropertyFeedbackService));
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            request.Content = JsonContent.Create(new
            {
                model = config.Model.Trim(),
                temperature = 0.1,
                messages = new object[]
                {
                    new { role = "system", content = "You extract showing feedback for a real-estate CRM. Return only valid JSON." },
                    new { role = "user", content = prompt }
                }
            });

            if (!string.IsNullOrWhiteSpace(config.ApiKey))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey.Trim());
            }

            using var response = await client.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return document.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "{}";
        }

        private async Task<string> RequestOllamaAnalysisAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var baseUrl = NormalizeBaseUrl(config.BaseUrl, "http://localhost:11434");
            using var client = _httpClientFactory.CreateClient(nameof(PropertyFeedbackService));
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/chat");
            request.Content = JsonContent.Create(new
            {
                model = config.Model.Trim(),
                stream = false,
                format = "json",
                messages = new object[]
                {
                    new { role = "system", content = "You extract showing feedback for a real-estate CRM. Return only valid JSON." },
                    new { role = "user", content = prompt }
                }
            });

            using var response = await client.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();
            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return document.RootElement.GetProperty("message").GetProperty("content").GetString() ?? "{}";
        }

        private async Task<GenericDeliveryResult> DeliverChannelsAsync(
            List<AgencyCommunicationChannel> channels,
            string email,
            string phone,
            string subject,
            string message,
            CancellationToken ct)
        {
            var normalizedChannels = NormalizeChannels(channels, [AgencyCommunicationChannel.Email]);
            var results = new List<string>();
            var success = false;

            foreach (var channel in normalizedChannels)
            {
                GenericDeliveryResult result;
                try
                {
                    result = channel switch
                    {
                        AgencyCommunicationChannel.Email => await SendEmailAsync(email, subject, message, ct),
                        AgencyCommunicationChannel.SMS => await SendSmsAsync(phone, message, ct),
                        _ => new GenericDeliveryResult(false, channel.ToString(), $"{channel} is not supported for feedback automation yet."),
                    };
                }
                catch (Exception ex)
                {
                    result = new GenericDeliveryResult(false, channel.ToString(), ex.Message);
                }

                results.Add(result.Summary);
                success |= result.Success;
            }

            return new GenericDeliveryResult(success, string.Join(", ", normalizedChannels), string.Join(" | ", results));
        }

        private async Task<GenericDeliveryResult> SendEmailAsync(string targetEmail, string subject, string message, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                return new GenericDeliveryResult(false, "SMTP Mail", "Email target missing.");
            }

            var mailConfig = await _agencyIntegrationWorkspaceService.GetMailProviderConfigAsync(ct)
                ?? throw new ArgumentException("SMTP mail is not configured yet.");

            var emailMessage = new MimeMessage();
            emailMessage.From.Add(new MailboxAddress(
                string.IsNullOrWhiteSpace(mailConfig.FromName) ? mailConfig.FromEmail : mailConfig.FromName,
                mailConfig.FromEmail));
            emailMessage.To.Add(MailboxAddress.Parse(targetEmail));
            emailMessage.Subject = subject;
            emailMessage.Body = new TextPart("plain") { Text = message };

            using var client = new SmtpClient();
            client.Timeout = 15000;
            await client.ConnectAsync(mailConfig.Host.Trim(), mailConfig.Port, ResolveSmtpSecureSocketOptions(mailConfig.Port, mailConfig.UseSsl), ct);
            await client.AuthenticateAsync(mailConfig.Username.Trim(), mailConfig.Password.Trim(), ct);
            await client.SendAsync(emailMessage, ct);
            await client.DisconnectAsync(true, ct);

            var provider = string.IsNullOrWhiteSpace(mailConfig.ProviderName) ? "SMTP Mail" : mailConfig.ProviderName.Trim();
            return new GenericDeliveryResult(true, provider, $"Email sent to {targetEmail} via {provider}.");
        }

        private async Task<GenericDeliveryResult> SendSmsAsync(string targetPhone, string message, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(targetPhone))
            {
                return new GenericDeliveryResult(false, "CRM SMS", "SMS target missing.");
            }

            var communicationConfig = await _agencyIntegrationWorkspaceService.GetCommunicationConfigAsync(ct)
                ?? throw new ArgumentException("Communication provider is not configured yet.");

            if (!communicationConfig.SupportsSms)
            {
                throw new ArgumentException($"{communicationConfig.ProviderName} is saved without SMS support.");
            }

            var providerName = NormalizeText(communicationConfig.ProviderName, "Twilio");

            switch (providerName.ToLowerInvariant())
            {
                case "plivo":
                    await SendPlivoSmsAsync(communicationConfig, targetPhone, message, ct);
                    break;
                case "custom":
                    await SendCustomSmsAsync(communicationConfig, targetPhone, message, ct);
                    break;
                default:
                    await SendTwilioSmsAsync(communicationConfig, targetPhone, message, ct);
                    break;
            }

            return new GenericDeliveryResult(true, providerName, $"SMS sent to {targetPhone} via {providerName}.");
        }

        private async Task SendTwilioSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["To"] = targetPhone,
                ["From"] = config.FromNumber.Trim(),
                ["Body"] = message,
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/2010-04-01/Accounts/{Uri.EscapeDataString(config.AccountId.Trim())}/Messages.json"),
                content,
                ct);
        }

        private async Task SendPlivoSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            using var content = JsonContent.Create(new
            {
                src = config.FromNumber.Trim(),
                dst = targetPhone,
                text = message,
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/v1/Account/{Uri.EscapeDataString(config.AccountId.Trim())}/Message/"),
                content,
                ct);
        }

        private async Task SendCustomSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            var baseUrl = NormalizeLooseText(config.BaseUrl);
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                throw new ArgumentException("A custom SMS endpoint is required for the custom communication provider.");
            }

            using var content = JsonContent.Create(new
            {
                accountId = config.AccountId.Trim(),
                from = config.FromNumber.Trim(),
                to = targetPhone,
                body = message,
            });

            await SendProviderRequestAsync(config, HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/messages", content, ct);
        }

        private async Task SendProviderRequestAsync(
            CommunicationProviderWriteRequest config,
            HttpMethod method,
            string url,
            HttpContent content,
            CancellationToken ct)
        {
            using var client = _httpClientFactory.CreateClient(nameof(PropertyFeedbackService));
            client.Timeout = TimeSpan.FromSeconds(20);

            using var request = new HttpRequestMessage(method, url) { Content = content };
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.ASCII.GetBytes($"{config.AccountId.Trim()}:{config.AuthToken.Trim()}")));

            using var response = await client.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            var detail = await response.Content.ReadAsStringAsync(ct);
            throw new ArgumentException($"Communication provider returned {(int)response.StatusCode}: {(string.IsNullOrWhiteSpace(detail) ? response.ReasonPhrase : detail)}");
        }

        private async Task<string?> BuildReplySkipReasonAsync(ShowingFeedbackRequest request, CancellationToken ct)
        {
            var normalizedEmail = NormalizeLooseText(request.RecipientEmail).ToLowerInvariant();
            var normalizedPhone = NormalizeLooseText(request.RecipientPhone);

            var existingFeedback = await _db.PropertyVisitFeedbackItems
                .AsNoTracking()
                .AnyAsync(item =>
                    item.PropertyId == request.PropertyId &&
                    (
                        (!string.IsNullOrWhiteSpace(normalizedEmail) && item.ContactEmail == normalizedEmail) ||
                        (!string.IsNullOrWhiteSpace(normalizedPhone) && item.ContactPhone == normalizedPhone)
                    ) &&
                    item.FeedbackAt >= request.CreatedAt, ct);

            if (existingFeedback)
            {
                return "Reply already captured in feedback inbox.";
            }

            if (!string.IsNullOrWhiteSpace(normalizedEmail))
            {
                var hasMailboxReply = await _db.MailInbox
                    .AsNoTracking()
                    .AnyAsync(item => item.Email == normalizedEmail && item.CreatedAt >= request.CreatedAt, ct);
                if (hasMailboxReply)
                {
                    return $"Mailbox reply already arrived from {normalizedEmail}.";
                }
            }

            if (request.LeadId.HasValue)
            {
                var hasLeadReply = await _db.LeadHistoryEntries
                    .AsNoTracking()
                    .AnyAsync(item =>
                        item.LeadId == request.LeadId.Value &&
                        item.Direction == LeadHistoryDirection.Incoming &&
                        item.CreatedAt >= request.CreatedAt, ct);
                if (hasLeadReply)
                {
                    return "Lead already replied after showing request.";
                }
            }

            return null;
        }

        private async Task<Property?> ResolvePropertyAsync(
            Dictionary<string, string> row,
            Dictionary<string, string> mappings,
            CancellationToken ct)
        {
            var rawId = ReadMapped(row, mappings, "propertyId", "property_id");
            if (int.TryParse(rawId, out var propertyId) && propertyId > 0)
            {
                return await _db.Properties.AsNoTracking().FirstOrDefaultAsync(item => item.Id == propertyId, ct);
            }

            var title = ReadMapped(row, mappings, "propertyTitle", "property", "propertyName");
            if (string.IsNullOrWhiteSpace(title))
            {
                return null;
            }

            var normalizedTitle = title.Trim().ToLowerInvariant();
            return await _db.Properties.AsNoTracking().FirstOrDefaultAsync(item => item.Title.ToLower() == normalizedTitle, ct)
                ?? await _db.Properties.AsNoTracking().FirstOrDefaultAsync(item => item.Title.ToLower().Contains(normalizedTitle), ct);
        }

        private async Task<Lead?> ResolveLeadAsync(
            Dictionary<string, string> row,
            Dictionary<string, string> mappings,
            CancellationToken ct)
        {
            var email = NormalizeLooseText(ReadMapped(row, mappings, "leadEmail", "contactEmail", "email")).ToLowerInvariant();
            if (!string.IsNullOrWhiteSpace(email))
            {
                return await _db.Leads.FirstOrDefaultAsync(item => item.Email == email, ct);
            }

            var phone = NormalizeLooseText(ReadMapped(row, mappings, "leadPhone", "contactPhone", "phone"));
            if (!string.IsNullOrWhiteSpace(phone))
            {
                return await _db.Leads.FirstOrDefaultAsync(item => item.Phone == phone, ct);
            }

            return null;
        }

        private async Task<ShowingBooking?> ResolveShowingAsync(
            int propertyId,
            int? leadId,
            Dictionary<string, string> row,
            Dictionary<string, string> mappings,
            CancellationToken ct)
        {
            var startAt = ParseDate(ReadMapped(row, mappings, "startAt", "showingTime"));
            var query = _db.ShowingBookings
                .Where(item => item.PropertyId == propertyId)
                .AsQueryable();

            if (leadId.HasValue)
            {
                query = query.Where(item => item.LeadId == leadId.Value);
            }

            if (startAt.HasValue)
            {
                var windowStart = startAt.Value.AddHours(-4);
                var windowEnd = startAt.Value.AddHours(4);
                query = query.Where(item => item.StartAt >= windowStart && item.StartAt <= windowEnd);
            }

            return await query.OrderByDescending(item => item.StartAt).FirstOrDefaultAsync(ct);
        }

        private async Task<Lead> CreateImportedLeadAsync(
            Property property,
            Dictionary<string, string> row,
            Dictionary<string, string> mappings,
            string createdBy,
            DateTime startAt,
            CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var lead = new Lead
            {
                Name = NormalizeText(ReadMapped(row, mappings, "contactName", "name"), "Imported Showing Lead"),
                Email = NormalizeLooseText(ReadMapped(row, mappings, "contactEmail", "email")).ToLowerInvariant(),
                Phone = NormalizeLooseText(ReadMapped(row, mappings, "contactPhone", "phone")),
                Summary = $"Imported showing for {property.Title}.",
                Property = property.Title,
                Budget = string.Empty,
                Stage = LeadStage.Visit,
                Priority = LeadPriority.Warm,
                Agent = string.Empty,
                AgentId = property.AgentId,
                Source = "Showing Import",
                ShowingAgentName = NormalizeLooseText(ReadMapped(row, mappings, "showingAgentName", "brokerName")),
                ShowingAgentEmail = NormalizeLooseText(ReadMapped(row, mappings, "showingAgentEmail", "brokerEmail")).ToLowerInvariant(),
                ShowingAgentPhone = NormalizeLooseText(ReadMapped(row, mappings, "showingAgentPhone", "brokerPhone")),
                Interest = "Schedule Viewing",
                Timeline = "Completed Visit",
                InBoard = true,
                NextActionDate = startAt.AddHours(2),
                NextActionType = "Feedback",
                FollowUpStatus = LeadFollowUpStatus.Scheduled,
                Notes = [$"Imported by {NormalizeText(createdBy, "Admin")}"],
                CreatedAt = now,
                UpdatedAt = now,
                LastActivityAt = now,
            };

            await _db.Leads.AddAsync(lead, ct);
            await _db.SaveChangesAsync(ct);
            return lead;
        }

        private static DateTime? ParseDate(string? value)
        {
            return DateTime.TryParse(value, out var parsed)
                ? parsed.Kind == DateTimeKind.Utc ? parsed : parsed.ToUniversalTime()
                : null;
        }

        private static PropertyFeedbackSentiment ParseSentiment(string? value)
        {
            var normalized = NormalizeLooseText(value).ToLowerInvariant();
            return normalized switch
            {
                "negative" => PropertyFeedbackSentiment.Negative,
                "mixed" => PropertyFeedbackSentiment.Mixed,
                "positive" => PropertyFeedbackSentiment.Positive,
                _ => PropertyFeedbackSentiment.Unknown,
            };
        }

        private static ShowingBookingStatus ParseShowingStatus(string? value)
        {
            return Enum.TryParse<ShowingBookingStatus>(NormalizeLooseText(value), true, out var parsed)
                ? parsed
                : ShowingBookingStatus.Completed;
        }

        private static bool IsOwnerReportDue(PropertyFeedbackAutomationSettings settings, DateTime now)
        {
            var lastRun = settings.LastOwnerReportRunAt;
            if (!lastRun.HasValue)
            {
                return true;
            }

            if (settings.OwnerReportFrequency == FeedbackAutomationFrequency.Weekly)
            {
                return now.DayOfWeek == (DayOfWeek)settings.OwnerReportDayOfWeek &&
                       now.Hour >= settings.OwnerReportSendHourUtc &&
                       now.Date > lastRun.Value.Date;
            }

            return now.Day >= settings.OwnerReportDayOfMonth &&
                   now.Hour >= settings.OwnerReportSendHourUtc &&
                   (now.Year > lastRun.Value.Year || now.Month > lastRun.Value.Month);
        }

        private static string ApplyTokens(
            string template,
            Property property,
            Lead? lead,
            string recipientName,
            DateTime showingTime,
            List<string> issues)
        {
            return template
                .Replace("{{recipient_name}}", NormalizeText(recipientName, "there"), StringComparison.Ordinal)
                .Replace("{{client_name}}", NormalizeText(lead?.Name, NormalizeText(recipientName, "client")), StringComparison.Ordinal)
                .Replace("{{property_title}}", property.Title, StringComparison.Ordinal)
                .Replace("{{property_address}}", NormalizeText(property.ExactLocation, property.Location), StringComparison.Ordinal)
                .Replace("{{showing_time}}", showingTime.ToString("u"), StringComparison.Ordinal)
                .Replace("{{issue_list}}", issues.Count == 0 ? "No issues captured yet." : string.Join(", ", issues), StringComparison.Ordinal);
        }

        private static string ApplyOwnerReportTokens(
            string template,
            Property property,
            string feedbackSummary,
            List<string> issues,
            FeedbackAutomationFrequency frequency)
        {
            return template
                .Replace("{{owner_name}}", NormalizeText(property.OwnerName, "Owner"), StringComparison.Ordinal)
                .Replace("{{property_title}}", property.Title, StringComparison.Ordinal)
                .Replace("{{property_address}}", NormalizeText(property.ExactLocation, property.Location), StringComparison.Ordinal)
                .Replace("{{report_frequency}}", frequency == FeedbackAutomationFrequency.Weekly ? "weekly" : "monthly", StringComparison.Ordinal)
                .Replace("{{feedback_summary}}", feedbackSummary, StringComparison.Ordinal)
                .Replace("{{issue_list}}", issues.Count == 0 ? "No repeated objections captured." : string.Join("\n- ", ["Top issues", .. issues]), StringComparison.Ordinal)
                .Replace("{{recommendation_summary}}", issues.Count == 0 ? "Review pricing, imagery, and showing quality." : $"Main focus: {issues[0]}.", StringComparison.Ordinal);
        }

        private static string BuildOwnerFeedbackSummary(List<PropertyVisitFeedback> recentFeedback, List<string> topIssues)
        {
            if (recentFeedback.Count == 0)
            {
                return "No showing feedback captured in this period.";
            }

            var lines = recentFeedback
                .Take(5)
                .Select(item => $"{item.FeedbackAt:yyyy-MM-dd}: {NormalizeText(item.Summary, BuildSummary(item.FeedbackText))}")
                .ToList();

            if (topIssues.Count > 0)
            {
                lines.Add($"Most repeated issues: {string.Join(", ", topIssues)}.");
            }

            return string.Join("\n", lines);
        }

        private static string BuildFeedbackPrompt(MailboxInboundEmail email, IReadOnlyCollection<string> propertyTitles)
        {
            var propertyList = string.Join(", ", propertyTitles.Take(80));
            var builder = new StringBuilder();
            builder.AppendLine("Analyze this inbound message for a real-estate showing feedback workflow.");
            builder.AppendLine("Return strict JSON with keys: isShowingFeedback, propertyName, sentiment, summary, issues, contactName");
            builder.AppendLine("sentiment must be Positive, Mixed, Negative, or Unknown.");
            builder.AppendLine("issues must be short phrases.");
            builder.AppendLine("isShowingFeedback true only when the sender is sharing opinions after a visit, showing, tour, or viewing.");
            builder.AppendLine($"Known property titles: {propertyList}");
            builder.AppendLine($"Sender name: {email.SenderName}");
            builder.AppendLine($"Sender email: {email.SenderEmail}");
            builder.AppendLine($"Subject: {email.Subject}");
            builder.AppendLine("Body:");
            builder.AppendLine(email.Body);
            return builder.ToString();
        }

        private static string BuildSummary(string? value)
        {
            var normalized = Regex.Replace(value ?? string.Empty, @"\s+", " ").Trim();
            if (normalized.Length <= 220)
            {
                return normalized;
            }

            return normalized[..217].TrimEnd() + "...";
        }

        private static string ExtractJson(string content)
        {
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');
            return start >= 0 && end > start ? content[start..(end + 1)] : "{}";
        }

        private static string NormalizeBaseUrl(string? value, string fallback)
        {
            return (string.IsNullOrWhiteSpace(value) ? fallback : value.Trim()).TrimEnd('/');
        }

        private static List<AgencyCommunicationChannel> NormalizeChannels(
            IEnumerable<AgencyCommunicationChannel>? input,
            IEnumerable<AgencyCommunicationChannel> fallback)
        {
            var normalized = (input ?? fallback)
                .Where(item => item is AgencyCommunicationChannel.Email or AgencyCommunicationChannel.SMS)
                .Distinct()
                .ToList();
            return normalized.Count == 0 ? fallback.Distinct().ToList() : normalized;
        }

        private static List<string> NormalizeIssues(IEnumerable<string>? issues)
        {
            return (issues ?? [])
                .Select(item => NormalizeLooseText(item))
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static List<string> SplitTokens(string? value)
        {
            return NormalizeIssues((value ?? string.Empty).Split([',', ';', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        }

        private static string ReadMapped(Dictionary<string, string> row, Dictionary<string, string> mappings, params string[] keys)
        {
            foreach (var key in keys)
            {
                if (mappings.TryGetValue(key, out var mappedColumn) && row.TryGetValue(mappedColumn, out var mappedValue))
                {
                    return mappedValue ?? string.Empty;
                }

                if (row.TryGetValue(key, out var directValue))
                {
                    return directValue ?? string.Empty;
                }
            }

            return string.Empty;
        }

        private static string NormalizeText(string? value, string fallback)
        {
            var normalized = NormalizeLooseText(value);
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string NormalizeLooseText(string? value)
        {
            return (value ?? string.Empty).Trim();
        }

        private static PropertyFeedbackSentiment DetectSentiment(string normalized)
        {
            if (normalized.Contains("too expensive") || normalized.Contains("not interested") || normalized.Contains("bad") || normalized.Contains("problem"))
            {
                return PropertyFeedbackSentiment.Negative;
            }

            if (normalized.Contains("maybe") || normalized.Contains("but") || normalized.Contains("however"))
            {
                return PropertyFeedbackSentiment.Mixed;
            }

            if (normalized.Contains("love") || normalized.Contains("great") || normalized.Contains("good"))
            {
                return PropertyFeedbackSentiment.Positive;
            }

            return PropertyFeedbackSentiment.Unknown;
        }

        private static void AddIssueIfContains(List<string> issues, string normalized, string needle, string label)
        {
            if (normalized.Contains(needle))
            {
                issues.Add(label);
            }
        }

        private static string? FindPropertyTitle(IEnumerable<string> propertyTitles, string source)
        {
            var normalizedSource = source.Trim().ToLowerInvariant();
            if (normalizedSource.Length == 0)
            {
                return null;
            }

            return propertyTitles
                .Where(title => !string.IsNullOrWhiteSpace(title))
                .Select(title => title.Trim())
                .Where(title =>
                {
                    var normalizedTitle = title.ToLowerInvariant();
                    return normalizedSource.Contains(normalizedTitle) || normalizedTitle.Contains(normalizedSource);
                })
                .OrderByDescending(title => title.Length)
                .FirstOrDefault();
        }

        private static string NameFromEmail(string email)
        {
            var localPart = (email ?? string.Empty).Split('@').FirstOrDefault() ?? string.Empty;
            var readable = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
            return readable.Length == 0 ? "Email contact" : readable;
        }

        private static string DetectPhone(string content)
        {
            var match = PhoneRegex.Match(content ?? string.Empty);
            return match.Success ? Regex.Replace(match.Value, @"[^\d\+]", string.Empty).Trim() : string.Empty;
        }

        private static PropertyFeedbackAutomationSettings DefaultSettings()
        {
            return new PropertyFeedbackAutomationSettings
            {
                Id = SettingsId,
                OwnerReportEnabled = true,
                OwnerReportFrequency = FeedbackAutomationFrequency.Weekly,
                OwnerReportDayOfWeek = 1,
                OwnerReportDayOfMonth = 1,
                OwnerReportSendHourUtc = 8,
                OwnerReportChannels = [AgencyCommunicationChannel.Email],
                OwnerReportSubject = "Owner update for {{property_title}}",
                OwnerReportBody = "Hello {{owner_name}}, here is your {{report_frequency}} report for {{property_title}}.\n\n{{feedback_summary}}\n\n{{issue_list}}\n\n{{recommendation_summary}}",
                FeedbackRequestEnabled = true,
                FeedbackRequestDelayHours = 2,
                FeedbackRequestFollowUpDelayHours = 24,
                FeedbackRequestMaxFollowUps = 2,
                FeedbackRequestChannels = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS],
                FeedbackRequestSubject = "Showing feedback for {{property_title}}",
                FeedbackRequestBody = "Hello {{recipient_name}}, please share visit feedback for {{property_title}} shown on {{showing_time}}. Reply with objections, price concerns, location issues, condition notes, and next-step readiness.",
                AutoCaptureMailFeedback = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
        }

        private static MailKit.Security.SecureSocketOptions ResolveSmtpSecureSocketOptions(int port, bool useSsl)
        {
            if (!useSsl)
            {
                return MailKit.Security.SecureSocketOptions.None;
            }

            return port == 465
                ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : MailKit.Security.SecureSocketOptions.StartTlsWhenAvailable;
        }

        private static string BuildProviderUrl(CommunicationProviderWriteRequest config, string path)
        {
            var baseUrl = NormalizeLooseText(config.BaseUrl);
            var fallbackBaseUrl = NormalizeText(config.ProviderName, "Twilio").ToLowerInvariant() switch
            {
                "plivo" => "https://api.plivo.com",
                "custom" => baseUrl,
                _ => "https://api.twilio.com",
            };

            return $"{fallbackBaseUrl.TrimEnd('/')}{path}";
        }

        private sealed class FeedbackAnalysisResponse
        {
            public bool IsShowingFeedback { get; set; }
            public string? PropertyName { get; set; }
            public string? Sentiment { get; set; }
            public string? Summary { get; set; }
            public List<string>? Issues { get; set; }
            public string? ContactName { get; set; }
        }
    }
}
