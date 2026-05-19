using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class LeadCampaignImportRequest
    {
        public string BatchName { get; set; } = string.Empty;
        public string? TemplateId { get; set; }
        public string TemplateName { get; set; } = string.Empty;
        public Dictionary<string, string> LeadFieldMappings { get; set; } = [];
        public Dictionary<string, string> VariableMappings { get; set; } = [];
        public List<Dictionary<string, string>> Rows { get; set; } = [];
        public List<LeadHistoryKind> InitialKinds { get; set; } = [];
        public string InitialTitle { get; set; } = string.Empty;
        public string InitialMessage { get; set; } = string.Empty;
        public DateTime? InitialScheduledAt { get; set; }
        public bool EnableFollowUp { get; set; }
        public List<LeadHistoryKind> FollowUpKinds { get; set; } = [];
        public string FollowUpTitle { get; set; } = string.Empty;
        public string FollowUpMessage { get; set; } = string.Empty;
        public DateTime? FollowUpScheduledAt { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
    }

    public record LeadCampaignImportItemResponse(
        int Id,
        int RowNumber,
        int? LeadId,
        string LeadName,
        string LeadEmail,
        string LeadPhone,
        LeadCampaignImportItemStatus InitialStatus,
        LeadCampaignImportItemStatus? FollowUpStatus,
        string SkipReason,
        int? InitialHistoryEntryId,
        int? FollowUpHistoryEntryId,
        DateTime CreatedAt
    );

    public record LeadCampaignImportBatchResponse(
        int Id,
        string BatchName,
        string TemplateName,
        List<LeadHistoryKind> InitialKinds,
        List<LeadHistoryKind> FollowUpKinds,
        int TotalRows,
        int ImportedCount,
        int SentCount,
        int ScheduledCount,
        int SkippedCount,
        int FailedCount,
        LeadCampaignImportStatus Status,
        string CreatedBy,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        List<LeadCampaignImportItemResponse> Items
    );

    public class LeadCampaignImportService
    {
        private static readonly string[] SupportedLeadFields =
        [
            "name",
            "email",
            "phone",
            "summary",
            "property",
            "budget",
            "source",
            "interest",
            "timeline",
            "agent",
            "notes",
        ];

        private readonly AgencySettingsService _agencySettingsService;
        private readonly AppDbContext _db;
        private readonly LeadOutreachService _leadOutreachService;

        public LeadCampaignImportService(
            AppDbContext db,
            LeadOutreachService leadOutreachService,
            AgencySettingsService agencySettingsService)
        {
            _db = db;
            _leadOutreachService = leadOutreachService;
            _agencySettingsService = agencySettingsService;
        }

        public async Task<LeadCampaignImportBatchResponse> ImportAsync(
            LeadCampaignImportRequest request,
            CancellationToken ct = default)
        {
            Validate(request);

            var resolvedTemplate = await ResolveTemplateAsync(request, ct);
            var now = DateTime.UtcNow;
            var batch = new LeadCampaignImportBatch
            {
                BatchName = NormalizeText(request.BatchName, $"Lead import {now:yyyy-MM-dd HH:mm}"),
                CreatedAt = now,
                CreatedBy = NormalizeText(request.CreatedBy, "CRM"),
                CsvColumns = request.Rows
                    .SelectMany(item => item.Keys)
                    .Select(NormalizeColumnName)
                    .Where(item => item.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
                FollowUpKinds = request.EnableFollowUp ? NormalizeKinds(request.FollowUpKinds) : [],
                InitialKinds = NormalizeKinds(request.InitialKinds),
                LeadFieldMappings = NormalizeMappings(request.LeadFieldMappings),
                TemplateName = resolvedTemplate.TemplateName,
                TotalRows = request.Rows.Count,
                UpdatedAt = now,
                VariableMappings = NormalizeMappings(request.VariableMappings),
            };

            await _db.LeadCampaignImportBatches.AddAsync(batch, ct);
            await _db.SaveChangesAsync(ct);

            foreach (var rowWithIndex in request.Rows.Select((row, index) => new { Row = row, RowNumber = index + 1 }))
            {
                var item = new LeadCampaignImportItem
                {
                    BatchId = batch.Id,
                    CreatedAt = now,
                    RawData = NormalizeRow(rowWithIndex.Row),
                    RowNumber = rowWithIndex.RowNumber,
                    UpdatedAt = now,
                };

                try
                {
                    var leadValues = ExtractLeadValues(item.RawData, batch.LeadFieldMappings);
                    item.LeadName = GetValueOrFallback(leadValues, "name", $"Row {rowWithIndex.RowNumber}");
                    item.LeadEmail = GetValueOrFallback(leadValues, "email");
                    item.LeadPhone = GetValueOrFallback(leadValues, "phone");

                    if (string.IsNullOrWhiteSpace(item.LeadEmail))
                    {
                        item.InitialStatus = LeadCampaignImportItemStatus.Skipped;
                        item.SkipReason = "Email mapping is required for import rows.";
                        batch.SkippedCount++;
                        batch.Items.Add(item);
                        continue;
                    }

                    var lead = await UpsertLeadAsync(leadValues, ct);
                    item.LeadId = lead.Id;
                    batch.ImportedCount++;

                    var templateVariables = BuildTemplateVariables(
                        item.RawData,
                        leadValues,
                        batch.VariableMappings);

                    if (batch.InitialKinds.Count > 0 && !string.IsNullOrWhiteSpace(resolvedTemplate.InitialMessage))
                    {
                        foreach (var kind in batch.InitialKinds)
                        {
                            var initialResponse = await _leadOutreachService.DispatchAsync(new LeadOutreachDispatchRequest
                            {
                                CreatedBy = batch.CreatedBy,
                                Kind = kind,
                                LeadId = lead.Id,
                                Message = RenderTemplate(resolvedTemplate.InitialMessage, templateVariables),
                                ScheduledAt = request.InitialScheduledAt,
                                Title = RenderTemplate(resolvedTemplate.InitialTitle, templateVariables),
                            }, ct);

                            if (!item.InitialHistoryEntryId.HasValue)
                            {
                                item.InitialHistoryEntryId = initialResponse.Id;
                            }

                            item.InitialStatus = MergeStatuses(item.InitialStatus, initialResponse.Status);
                            item.RenderedInitialTitle = RenderTemplate(resolvedTemplate.InitialTitle, templateVariables);
                            item.RenderedInitialMessage = RenderTemplate(resolvedTemplate.InitialMessage, templateVariables);
                            UpdateBatchCounters(batch, MapImportStatus(initialResponse.Status));

                            if (MapImportStatus(initialResponse.Status) == LeadCampaignImportItemStatus.Failed)
                            {
                                item.SkipReason = initialResponse.Summary;
                            }
                        }
                    }

                    if (request.EnableFollowUp &&
                        batch.FollowUpKinds.Count > 0 &&
                        !string.IsNullOrWhiteSpace(resolvedTemplate.FollowUpMessage))
                    {
                        foreach (var kind in batch.FollowUpKinds)
                        {
                            var followUpResponse = await _leadOutreachService.DispatchAsync(new LeadOutreachDispatchRequest
                            {
                                CreatedBy = batch.CreatedBy,
                                Kind = kind,
                                LeadId = lead.Id,
                                Message = RenderTemplate(resolvedTemplate.FollowUpMessage, templateVariables),
                                ScheduledAt = request.FollowUpScheduledAt,
                                Title = RenderTemplate(resolvedTemplate.FollowUpTitle, templateVariables),
                            }, ct);

                            if (!item.FollowUpHistoryEntryId.HasValue)
                            {
                                item.FollowUpHistoryEntryId = followUpResponse.Id;
                            }

                            item.FollowUpStatus = MergeStatuses(item.FollowUpStatus, followUpResponse.Status);
                            item.RenderedFollowUpTitle = RenderTemplate(resolvedTemplate.FollowUpTitle, templateVariables);
                            item.RenderedFollowUpMessage = RenderTemplate(resolvedTemplate.FollowUpMessage, templateVariables);
                            UpdateBatchCounters(batch, MapImportStatus(followUpResponse.Status));

                            if (MapImportStatus(followUpResponse.Status) == LeadCampaignImportItemStatus.Failed)
                            {
                                item.SkipReason = string.IsNullOrWhiteSpace(item.SkipReason)
                                    ? followUpResponse.Summary
                                    : item.SkipReason;
                            }
                        }
                    }
                }
                catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
                {
                    item.InitialStatus = LeadCampaignImportItemStatus.Failed;
                    item.SkipReason = ex.Message;
                    batch.FailedCount++;
                }

                item.UpdatedAt = DateTime.UtcNow;
                batch.Items.Add(item);
            }

            batch.Status = batch.FailedCount > 0
                ? LeadCampaignImportStatus.Failed
                : batch.SkippedCount > 0
                    ? LeadCampaignImportStatus.CompletedWithSkips
                    : LeadCampaignImportStatus.Completed;
            batch.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            return await GetRequiredBatchAsync(batch.Id, ct);
        }

        public async Task<List<LeadCampaignImportBatchResponse>> GetRecentAsync(
            int take = 10,
            CancellationToken ct = default)
        {
            return await _db.LeadCampaignImportBatches
                .AsNoTracking()
                .Include(item => item.Items)
                .OrderByDescending(item => item.CreatedAt)
                .Take(Math.Clamp(take, 1, 50))
                .Select(MapBatch())
                .ToListAsync(ct);
        }

        private async Task<LeadCampaignImportBatchResponse> GetRequiredBatchAsync(int batchId, CancellationToken ct)
        {
            return await _db.LeadCampaignImportBatches
                .AsNoTracking()
                .Include(item => item.Items)
                .Where(item => item.Id == batchId)
                .Select(MapBatch())
                .FirstOrDefaultAsync(ct)
                ?? throw new InvalidOperationException("Import batch was not found after save.");
        }

        private static System.Linq.Expressions.Expression<Func<LeadCampaignImportBatch, LeadCampaignImportBatchResponse>> MapBatch()
        {
            return item => new LeadCampaignImportBatchResponse(
                item.Id,
                item.BatchName,
                item.TemplateName,
                item.InitialKinds,
                item.FollowUpKinds,
                item.TotalRows,
                item.ImportedCount,
                item.SentCount,
                item.ScheduledCount,
                item.SkippedCount,
                item.FailedCount,
                item.Status,
                item.CreatedBy,
                item.CreatedAt,
                item.UpdatedAt,
                item.Items
                    .OrderByDescending(child => child.RowNumber)
                    .Select(child => new LeadCampaignImportItemResponse(
                        child.Id,
                        child.RowNumber,
                        child.LeadId,
                        child.LeadName,
                        child.LeadEmail,
                        child.LeadPhone,
                        child.InitialStatus,
                        child.FollowUpStatus,
                        child.SkipReason,
                        child.InitialHistoryEntryId,
                        child.FollowUpHistoryEntryId,
                        child.CreatedAt
                    ))
                    .ToList()
            );
        }

        private async Task<Lead> UpsertLeadAsync(Dictionary<string, string> leadValues, CancellationToken ct)
        {
            var email = GetValueOrFallback(leadValues, "email").Trim().ToLowerInvariant();
            var phone = GetValueOrFallback(leadValues, "phone").Trim();

            var lead = await _db.Leads.FirstOrDefaultAsync(item =>
                item.Email == email || (!string.IsNullOrWhiteSpace(phone) && item.Phone == phone), ct);

            var now = DateTime.UtcNow;
            if (lead is null)
            {
                lead = new Lead
                {
                    CreatedAt = now,
                    Email = email,
                    FollowUpStatus = LeadFollowUpStatus.Open,
                    InBoard = false,
                    LastActivityAt = now,
                    Name = GetValueOrFallback(leadValues, "name", email.Split('@')[0]),
                    Phone = phone,
                    Priority = LeadPriority.Warm,
                    Stage = LeadStage.New,
                    UpdatedAt = now,
                };

                ApplyLeadValues(lead, leadValues);
                await _db.Leads.AddAsync(lead, ct);
            }
            else
            {
                ApplyLeadValues(lead, leadValues);
                lead.UpdatedAt = now;
                lead.LastActivityAt = now;
            }

            await _db.SaveChangesAsync(ct);
            return lead;
        }

        private static void ApplyLeadValues(Lead lead, Dictionary<string, string> leadValues)
        {
            lead.Name = GetValueOrFallback(leadValues, "name", lead.Name);
            lead.Email = GetValueOrFallback(leadValues, "email", lead.Email).Trim().ToLowerInvariant();
            lead.Phone = GetValueOrFallback(leadValues, "phone", lead.Phone);
            lead.Summary = GetValueOrFallback(leadValues, "summary", lead.Summary);
            lead.Property = GetValueOrFallback(leadValues, "property", lead.Property);
            lead.Budget = GetValueOrFallback(leadValues, "budget", lead.Budget);
            lead.Source = GetValueOrFallback(leadValues, "source", string.IsNullOrWhiteSpace(lead.Source) ? "CSV Import" : lead.Source);
            lead.Interest = GetValueOrFallback(leadValues, "interest", lead.Interest);
            lead.Timeline = GetValueOrFallback(leadValues, "timeline", lead.Timeline);
            lead.Agent = GetValueOrFallback(leadValues, "agent", lead.Agent);

            var note = GetValueOrFallback(leadValues, "notes");
            if (!string.IsNullOrWhiteSpace(note) &&
                !lead.Notes.Any(item => string.Equals(item, note, StringComparison.OrdinalIgnoreCase)))
            {
                lead.Notes.Add(note);
            }
        }

        private static Dictionary<string, string> BuildTemplateVariables(
            Dictionary<string, string> row,
            Dictionary<string, string> leadValues,
            Dictionary<string, string> mappings)
        {
            var variables = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var mapping in mappings)
            {
                var token = NormalizeToken(mapping.Key);
                var column = NormalizeColumnName(mapping.Value);
                if (token.Length == 0 || column.Length == 0)
                {
                    continue;
                }

                variables[token] = row.TryGetValue(column, out var rowValue) ? rowValue : string.Empty;
            }

            variables["{{client_name}}"] = GetValueOrFallback(leadValues, "name", "Client");
            variables["{{email}}"] = GetValueOrFallback(leadValues, "email");
            variables["{{phone}}"] = GetValueOrFallback(leadValues, "phone");
            variables["{{property_address}}"] = GetValueOrFallback(leadValues, "property", "property");
            variables["{{budget}}"] = GetValueOrFallback(leadValues, "budget");
            variables["{{source}}"] = GetValueOrFallback(leadValues, "source", "CSV Import");
            variables["{{interest}}"] = GetValueOrFallback(leadValues, "interest");
            variables["{{timeline}}"] = GetValueOrFallback(leadValues, "timeline");
            variables["{{summary}}"] = GetValueOrFallback(leadValues, "summary");
            variables["{{agent_name}}"] = GetValueOrFallback(leadValues, "agent", "Agent");
            variables["{{agency_name}}"] = "EstateBlue";

            return variables;
        }

        private static Dictionary<string, string> ExtractLeadValues(
            Dictionary<string, string> row,
            Dictionary<string, string> mappings)
        {
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            foreach (var field in SupportedLeadFields)
            {
                values[field] = string.Empty;
            }

            foreach (var mapping in mappings)
            {
                var field = NormalizeColumnName(mapping.Key);
                var column = NormalizeColumnName(mapping.Value);
                if (!SupportedLeadFields.Contains(field, StringComparer.OrdinalIgnoreCase) || column.Length == 0)
                {
                    continue;
                }

                values[field] = row.TryGetValue(column, out var value) ? value : string.Empty;
            }

            return values;
        }

        private async Task<(string TemplateName, string InitialTitle, string InitialMessage, string FollowUpTitle, string FollowUpMessage)> ResolveTemplateAsync(
            LeadCampaignImportRequest request,
            CancellationToken ct)
        {
            var templateName = NormalizeText(request.TemplateName, "Custom import template");
            var initialTitle = request.InitialTitle;
            var initialMessage = request.InitialMessage;
            var followUpTitle = request.FollowUpTitle;
            var followUpMessage = request.FollowUpMessage;

            if (string.IsNullOrWhiteSpace(request.TemplateId))
            {
                return (templateName, initialTitle, initialMessage, followUpTitle, followUpMessage);
            }

            var templates = (await _agencySettingsService.GetAdminSettingsAsync()).CommunicationTemplates;
            var template = templates.FirstOrDefault(item =>
                string.Equals(item.Id, request.TemplateId, StringComparison.OrdinalIgnoreCase));

            if (template is null)
            {
                throw new ArgumentException("Selected outreach template was not found.");
            }

            return (
                template.Name,
                string.IsNullOrWhiteSpace(initialTitle) ? template.Subject : initialTitle,
                string.IsNullOrWhiteSpace(initialMessage) ? template.Body : initialMessage,
                followUpTitle,
                followUpMessage
            );
        }

        private static string RenderTemplate(string template, Dictionary<string, string> variables)
        {
            var rendered = template ?? string.Empty;

            foreach (var variable in variables)
            {
                rendered = rendered.Replace(variable.Key, variable.Value ?? string.Empty, StringComparison.OrdinalIgnoreCase);
            }

            return rendered.Trim();
        }

        private static Dictionary<string, string> NormalizeMappings(Dictionary<string, string>? input)
        {
            return (input ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.Key) && !string.IsNullOrWhiteSpace(item.Value))
                .ToDictionary(
                    item => NormalizeColumnName(item.Key),
                    item => NormalizeColumnName(item.Value),
                    StringComparer.OrdinalIgnoreCase);
        }

        private static Dictionary<string, string> NormalizeRow(Dictionary<string, string>? input)
        {
            return (input ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.Key))
                .ToDictionary(
                    item => NormalizeColumnName(item.Key),
                    item => (item.Value ?? string.Empty).Trim(),
                    StringComparer.OrdinalIgnoreCase);
        }

        private static string NormalizeColumnName(string? value)
        {
            return (value ?? string.Empty).Trim();
        }

        private static string NormalizeToken(string? value)
        {
            var token = (value ?? string.Empty).Trim();
            if (token.Length == 0)
            {
                return string.Empty;
            }

            return token.StartsWith("{{", StringComparison.Ordinal) && token.EndsWith("}}", StringComparison.Ordinal)
                ? token
                : $"{{{{{token.Trim('{', '}')}}}}}";
        }

        private static string NormalizeText(string? value, string fallback = "")
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? fallback : normalized;
        }

        private static string GetValueOrFallback(
            Dictionary<string, string> values,
            string key,
            string fallback = "")
        {
            return values.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
                ? value.Trim()
                : fallback;
        }

        private static void Validate(LeadCampaignImportRequest request)
        {
            if (request.Rows.Count == 0)
            {
                throw new ArgumentException("Add at least one CSV row before importing.");
            }

            var initialKinds = NormalizeKinds(request.InitialKinds);
            var followUpKinds = NormalizeKinds(request.FollowUpKinds);

            if (initialKinds.Count == 0 &&
                (!request.EnableFollowUp || followUpKinds.Count == 0))
            {
                throw new ArgumentException("Choose an initial outreach, a follow-up outreach, or both.");
            }

            if (initialKinds.Count > 0)
            {
                ValidateOutreachBlock(initialKinds, request.InitialTitle, request.InitialMessage);
            }

            if (request.EnableFollowUp)
            {
                if (followUpKinds.Count == 0)
                {
                    throw new ArgumentException("Choose at least one follow-up channel.");
                }

                if (!request.FollowUpScheduledAt.HasValue)
                {
                    throw new ArgumentException("Choose a follow-up schedule time.");
                }

                ValidateOutreachBlock(followUpKinds, request.FollowUpTitle, request.FollowUpMessage);
            }

            if (!request.LeadFieldMappings.TryGetValue("email", out var emailColumn) ||
                string.IsNullOrWhiteSpace(emailColumn))
            {
                throw new ArgumentException("Map an email column before importing.");
            }
        }

        private static void ValidateOutreachBlock(List<LeadHistoryKind> kinds, string title, string message)
        {
            if (kinds.Any(kind => kind is not LeadHistoryKind.Email and not LeadHistoryKind.Sms and not LeadHistoryKind.Call))
            {
                throw new ArgumentException("Only email, SMS, and call outreach are supported.");
            }

            if (string.IsNullOrWhiteSpace(message))
            {
                throw new ArgumentException("Template message is required.");
            }

            if (kinds.Contains(LeadHistoryKind.Email) && string.IsNullOrWhiteSpace(title))
            {
                throw new ArgumentException("Email subject is required.");
            }
        }

        private static List<LeadHistoryKind> NormalizeKinds(IEnumerable<LeadHistoryKind>? input)
        {
            return (input ?? [])
                .Where(kind => kind is LeadHistoryKind.Email or LeadHistoryKind.Sms or LeadHistoryKind.Call)
                .Distinct()
                .ToList();
        }

        private static LeadCampaignImportItemStatus MapImportStatus(LeadHistoryStatus status)
        {
            return status == LeadHistoryStatus.Scheduled
                ? LeadCampaignImportItemStatus.Scheduled
                : status == LeadHistoryStatus.Failed
                    ? LeadCampaignImportItemStatus.Failed
                    : LeadCampaignImportItemStatus.Sent;
        }

        private static LeadCampaignImportItemStatus MergeStatuses(
            LeadCampaignImportItemStatus? current,
            LeadHistoryStatus status)
        {
            var next = MapImportStatus(status);
            if (!current.HasValue)
            {
                return next;
            }

            if (current == LeadCampaignImportItemStatus.Failed || next == LeadCampaignImportItemStatus.Failed)
            {
                return LeadCampaignImportItemStatus.Failed;
            }

            if (current == LeadCampaignImportItemStatus.Scheduled || next == LeadCampaignImportItemStatus.Scheduled)
            {
                return LeadCampaignImportItemStatus.Scheduled;
            }

            return LeadCampaignImportItemStatus.Sent;
        }

        private static void UpdateBatchCounters(LeadCampaignImportBatch batch, LeadCampaignImportItemStatus status)
        {
            if (status == LeadCampaignImportItemStatus.Scheduled)
            {
                batch.ScheduledCount++;
                return;
            }

            if (status == LeadCampaignImportItemStatus.Sent)
            {
                batch.SentCount++;
                return;
            }

            if (status == LeadCampaignImportItemStatus.Failed)
            {
                batch.FailedCount++;
            }
        }
    }
}
