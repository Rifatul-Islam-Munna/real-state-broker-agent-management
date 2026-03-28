using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class CreateLeadHistoryEntryInput
    {
        public int LeadId { get; set; }
        public LeadHistoryKind Kind { get; set; } = LeadHistoryKind.Note;
        public LeadHistoryDirection Direction { get; set; } = LeadHistoryDirection.Internal;
        public LeadHistoryStatus Status { get; set; } = LeadHistoryStatus.Logged;
        public string Title { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string Provider { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime? ScheduledAt { get; set; }
        public DateTime? OccurredAt { get; set; }
    }

    public record LeadHistoryEntryResponse(
        int Id,
        int LeadId,
        LeadHistoryKind Kind,
        LeadHistoryDirection Direction,
        LeadHistoryStatus Status,
        string Title,
        string Summary,
        string Body,
        string Provider,
        string CreatedBy,
        DateTime? ScheduledAt,
        DateTime? OccurredAt,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public class LeadHistoryService
    {
        private readonly AppDbContext _db;

        public LeadHistoryService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<LeadHistoryEntryResponse>> GetForLeadAsync(int leadId, CancellationToken ct = default)
        {
            var storedEntries = await _db.LeadHistoryEntries
                .AsNoTracking()
                .Where(item => item.LeadId == leadId)
                .OrderByDescending(item => item.ScheduledAt ?? item.OccurredAt ?? item.CreatedAt)
                .ThenByDescending(item => item.Id)
                .Select(item => new LeadHistoryEntryResponse(
                    item.Id,
                    item.LeadId,
                    item.Kind,
                    item.Direction,
                    item.Status,
                    item.Title,
                    item.Summary,
                    item.Body,
                    item.Provider,
                    item.CreatedBy,
                    item.ScheduledAt,
                    item.OccurredAt,
                    item.CreatedAt,
                    item.UpdatedAt
                ))
                .ToListAsync(ct);

            var mailEntries = await _db.MailInbox
                .AsNoTracking()
                .Where(item => item.LeadId == leadId)
                .Select(item => new LeadHistoryEntryResponse(
                    -item.Id,
                    leadId,
                    LeadHistoryKind.MailInbox,
                    LeadHistoryDirection.Incoming,
                    item.Status == MailInboxStatus.Replied
                        ? LeadHistoryStatus.Completed
                        : LeadHistoryStatus.Received,
                    string.IsNullOrWhiteSpace(item.Subject) ? "Incoming email" : item.Subject,
                    string.IsNullOrWhiteSpace(item.Subject) ? "Inbound email linked to this lead." : item.Subject,
                    item.Message,
                    "Mail Inbox",
                    string.IsNullOrWhiteSpace(item.Name) ? item.Email : item.Name,
                    null,
                    item.CreatedAt,
                    item.CreatedAt,
                    item.UpdatedAt
                ))
                .ToListAsync(ct);

            var contactEntries = await _db.ContactRequests
                .AsNoTracking()
                .Where(item => item.LeadId == leadId)
                .Select(item => new LeadHistoryEntryResponse(
                    -(100000 + item.Id),
                    leadId,
                    LeadHistoryKind.ContactForm,
                    LeadHistoryDirection.Incoming,
                    LeadHistoryStatus.Received,
                    string.IsNullOrWhiteSpace(item.InquiryType) ? "Contact form inquiry" : item.InquiryType,
                    string.IsNullOrWhiteSpace(item.Message) ? "Contact form inquiry linked to this lead." : item.Message,
                    item.Message,
                    "Contact Form",
                    string.IsNullOrWhiteSpace(item.Name) ? item.Email : item.Name,
                    null,
                    item.CreatedAt,
                    item.CreatedAt,
                    item.UpdatedAt
                ))
                .ToListAsync(ct);

            return storedEntries
                .Concat(mailEntries)
                .Concat(contactEntries)
                .OrderByDescending(item => item.ScheduledAt ?? item.OccurredAt ?? item.CreatedAt)
                .ThenByDescending(item => Math.Abs(item.Id))
                .ToList();
        }

        public async Task<LeadHistoryEntryResponse> CreateAsync(CreateLeadHistoryEntryInput input, CancellationToken ct = default)
        {
            Validate(input);

            var lead = await _db.Leads.FirstOrDefaultAsync(item => item.Id == input.LeadId, ct)
                ?? throw new InvalidOperationException("Lead was not found.");

            var now = DateTime.UtcNow;
            var entry = new LeadHistoryEntry
            {
                Body = NormalizeOptional(input.Body) ?? string.Empty,
                CreatedAt = now,
                CreatedBy = NormalizeOptional(input.CreatedBy) ?? "Admin",
                Direction = input.Direction,
                Kind = input.Kind,
                LeadId = input.LeadId,
                OccurredAt = input.OccurredAt,
                Provider = NormalizeOptional(input.Provider) ?? string.Empty,
                ScheduledAt = input.ScheduledAt,
                Status = input.Status,
                Summary = BuildSummary(input),
                Title = BuildTitle(input),
                UpdatedAt = now,
            };

            await _db.LeadHistoryEntries.AddAsync(entry, ct);

            lead.LastActivityAt = now;
            lead.UpdatedAt = now;

            await _db.SaveChangesAsync(ct);

            return new LeadHistoryEntryResponse(
                entry.Id,
                entry.LeadId,
                entry.Kind,
                entry.Direction,
                entry.Status,
                entry.Title,
                entry.Summary,
                entry.Body,
                entry.Provider,
                entry.CreatedBy,
                entry.ScheduledAt,
                entry.OccurredAt,
                entry.CreatedAt,
                entry.UpdatedAt
            );
        }

        public Task<LeadHistoryEntryResponse> AppendAsync(
            int leadId,
            LeadHistoryKind kind,
            LeadHistoryDirection direction,
            LeadHistoryStatus status,
            string title,
            string summary,
            string body,
            string provider = "",
            string createdBy = "System",
            DateTime? scheduledAt = null,
            DateTime? occurredAt = null,
            CancellationToken ct = default)
        {
            return CreateAsync(new CreateLeadHistoryEntryInput
            {
                Body = body,
                CreatedBy = createdBy,
                Direction = direction,
                Kind = kind,
                LeadId = leadId,
                OccurredAt = occurredAt,
                Provider = provider,
                ScheduledAt = scheduledAt,
                Status = status,
                Summary = summary,
                Title = title,
            }, ct);
        }

        private static void Validate(CreateLeadHistoryEntryInput input)
        {
            if (input.LeadId <= 0)
            {
                throw new ArgumentException("Lead id is required.");
            }

            if (string.IsNullOrWhiteSpace(input.Title) &&
                string.IsNullOrWhiteSpace(input.Summary) &&
                string.IsNullOrWhiteSpace(input.Body))
            {
                throw new ArgumentException("Add a title, summary, or body for the history item.");
            }
        }

        private static string BuildTitle(CreateLeadHistoryEntryInput input)
        {
            return NormalizeOptional(input.Title)
                ?? NormalizeOptional(input.Summary)
                ?? input.Kind switch
                {
                    LeadHistoryKind.Email => "Email activity",
                    LeadHistoryKind.Sms => "SMS activity",
                    LeadHistoryKind.Call => "Call activity",
                    LeadHistoryKind.PropertyChat => "Property chat activity",
                    LeadHistoryKind.ContactForm => "Contact form activity",
                    LeadHistoryKind.MailInbox => "Mail inbox activity",
                    LeadHistoryKind.System => "System activity",
                    _ => "Lead note",
                };
        }

        private static string BuildSummary(CreateLeadHistoryEntryInput input)
        {
            var summary = NormalizeOptional(input.Summary);
            if (!string.IsNullOrWhiteSpace(summary))
            {
                return summary;
            }

            var body = NormalizeOptional(input.Body);
            if (string.IsNullOrWhiteSpace(body))
            {
                return BuildTitle(input);
            }

            return body.Length > 220 ? $"{body[..217]}..." : body;
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
