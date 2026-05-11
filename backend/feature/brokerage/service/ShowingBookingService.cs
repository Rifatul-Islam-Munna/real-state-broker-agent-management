using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record CreateShowingBookingRequest(
        int PropertyId,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        DateTime StartAt,
        DateTime? EndAt,
        string Notes
    );

    public record UpdateShowingBookingRequest(
        int Id,
        ShowingBookingStatus Status,
        string Notes
    );

    public record ShowingBookingResponse(
        int Id,
        int? LeadId,
        int PropertyId,
        string PropertyTitle,
        int? AgentId,
        string AssignedAgent,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        DateTime StartAt,
        DateTime EndAt,
        ShowingBookingStatus Status,
        string Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ShowingAvailabilitySlot(
        DateTime StartAt,
        DateTime EndAt,
        bool IsAvailable
    );

    public class ShowingBookingService(
        AppDbContext db,
        LeadAssignmentService leadAssignmentService,
        LeadHistoryService leadHistoryService,
        BrokerageAuditService auditService)
    {
        private static readonly TimeSpan[] DefaultSlotTimes =
        [
            new(9, 0, 0),
            new(10, 30, 0),
            new(13, 0, 0),
            new(15, 30, 0)
        ];

        public async Task<ShowingBookingResponse> CreateAsync(CreateShowingBookingRequest request, CancellationToken ct = default)
        {
            var property = await db.Properties
                .Include(item => item.Agent)
                .FirstOrDefaultAsync(item => item.Id == request.PropertyId, ct)
                ?? throw new InvalidOperationException("Property was not found.");

            var startAt = request.StartAt.ToUniversalTime();
            if (startAt <= DateTime.UtcNow.AddMinutes(15))
            {
                throw new ArgumentException("Choose a future showing time.");
            }

            var endAt = (request.EndAt ?? request.StartAt.AddMinutes(45)).ToUniversalTime();
            if (endAt <= startAt)
            {
                endAt = startAt.AddMinutes(45);
            }

            var normalizedEmail = (request.ContactEmail ?? string.Empty).Trim().ToLowerInvariant();
            var normalizedPhone = (request.ContactPhone ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(request.ContactName) ||
                (string.IsNullOrWhiteSpace(normalizedEmail) && string.IsNullOrWhiteSpace(normalizedPhone)))
            {
                throw new ArgumentException("Name plus email or phone is required.");
            }

            var lead = !string.IsNullOrWhiteSpace(normalizedEmail)
                ? await db.Leads.FirstOrDefaultAsync(item => item.Email == normalizedEmail, ct)
                : null;

            var now = DateTime.UtcNow;
            if (lead is null)
            {
                lead = new Lead
                {
                    Agent = property.Agent?.FullName ?? string.Empty,
                    AgentId = property.AgentId,
                    Budget = string.Empty,
                    CreatedAt = now,
                    Email = normalizedEmail,
                    FollowUpStatus = LeadFollowUpStatus.Scheduled,
                    InBoard = true,
                    Interest = "Schedule Viewing",
                    LastActivityAt = now,
                    Name = (request.ContactName ?? string.Empty).Trim(),
                    NextActionDate = startAt,
                    NextActionType = "Showing",
                    Notes = string.IsNullOrWhiteSpace(request.Notes) ? [] : [request.Notes.Trim()],
                    Phone = normalizedPhone,
                    Priority = LeadPriority.HighPriority,
                    Property = property.Title,
                    Source = "Schedule Viewing",
                    Stage = LeadStage.Visit,
                    Summary = $"Viewing requested for {property.Title}.",
                    Timeline = startAt.ToString("u"),
                    UpdatedAt = now,
                };

                await leadAssignmentService.ApplyAssignmentAsync(
                    lead,
                    new LeadAssignmentContext(property.Id, property.Title, property.Location, property.PropertyType, property.ListingType),
                    ct);
                await db.Leads.AddAsync(lead, ct);
                await db.SaveChangesAsync(ct);
            }
            else
            {
                lead.AgentId = property.AgentId ?? lead.AgentId;
                lead.Agent = property.Agent?.FullName ?? lead.Agent;
                lead.InBoard = true;
                lead.LastActivityAt = now;
                lead.NextActionDate = startAt;
                lead.NextActionType = "Showing";
                lead.FollowUpStatus = LeadFollowUpStatus.Scheduled;
                lead.Phone = string.IsNullOrWhiteSpace(normalizedPhone) ? lead.Phone : normalizedPhone;
                lead.Property = property.Title;
                lead.Source = "Schedule Viewing";
                lead.Stage = LeadStage.Visit;
                lead.UpdatedAt = now;
                await db.SaveChangesAsync(ct);
            }

            var booking = new ShowingBooking
            {
                AgentId = lead.AgentId ?? property.AgentId,
                ContactEmail = normalizedEmail,
                ContactName = (request.ContactName ?? string.Empty).Trim(),
                ContactPhone = normalizedPhone,
                CreatedAt = now,
                EndAt = endAt,
                LeadId = lead.Id,
                Notes = (request.Notes ?? string.Empty).Trim(),
                PropertyId = property.Id,
                StartAt = startAt,
                Status = ShowingBookingStatus.Scheduled,
                UpdatedAt = now,
            };

            await db.ShowingBookings.AddAsync(booking, ct);
            auditService.AddLog("ShowingBooking", null, "Create", null, null, property.Title, "Website", request.Notes);
            await db.SaveChangesAsync(ct);

            await leadHistoryService.AppendAsync(
                lead.Id,
                LeadHistoryKind.System,
                LeadHistoryDirection.Scheduled,
                LeadHistoryStatus.Scheduled,
                $"Showing scheduled for {property.Title}",
                $"Showing scheduled for {startAt:u}.",
                booking.Notes,
                createdBy: "Website",
                scheduledAt: startAt);

            return await GetRequiredAsync(booking.Id, ct);
        }

        public async Task<PaginatedResult<ShowingBookingResponse>> GetAsync(
            int page = 1,
            int pageSize = 20,
            ShowingBookingStatus? status = null,
            int? agentId = null,
            int? propertyId = null,
            CancellationToken ct = default)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);
            var query = db.ShowingBookings
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Agent)
                .AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(item => item.Status == status.Value);
            }

            if (agentId.HasValue)
            {
                query = query.Where(item => item.AgentId == agentId.Value);
            }

            if (propertyId.HasValue)
            {
                query = query.Where(item => item.PropertyId == propertyId.Value);
            }

            var totalCount = await query.CountAsync(ct);
            var items = await query
                .OrderBy(item => item.StartAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(item => new ShowingBookingResponse(
                    item.Id,
                    item.LeadId,
                    item.PropertyId,
                    item.Property == null ? "Property #" + item.PropertyId : item.Property.Title,
                    item.AgentId,
                    item.Agent == null ? string.Empty : item.Agent.FullName,
                    item.ContactName,
                    item.ContactEmail,
                    item.ContactPhone,
                    item.StartAt,
                    item.EndAt,
                    item.Status,
                    item.Notes,
                    item.CreatedAt,
                    item.UpdatedAt))
                .ToListAsync(ct);

            return new PaginatedResult<ShowingBookingResponse>
            {
                Items = items,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }

        public async Task<ShowingBookingResponse?> UpdateAsync(UpdateShowingBookingRequest request, string actor, CancellationToken ct = default)
        {
            var booking = await db.ShowingBookings.FirstOrDefaultAsync(item => item.Id == request.Id, ct);
            if (booking is null)
            {
                return null;
            }

            var oldStatus = booking.Status;
            booking.Status = request.Status;
            booking.Notes = (request.Notes ?? string.Empty).Trim();
            booking.UpdatedAt = DateTime.UtcNow;
            auditService.AddLog("ShowingBooking", booking.Id, "Update", "status", oldStatus.ToString(), booking.Status.ToString(), actor, booking.Notes);
            await db.SaveChangesAsync(ct);

            return await GetRequiredAsync(booking.Id, ct);
        }

        public async Task<List<ShowingAvailabilitySlot>> GetAvailabilityAsync(int propertyId, DateTime date, CancellationToken ct = default)
        {
            var day = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
            var nextDay = day.AddDays(1);
            var existing = await db.ShowingBookings
                .AsNoTracking()
                .Where(item =>
                    item.PropertyId == propertyId &&
                    item.Status == ShowingBookingStatus.Scheduled &&
                    item.StartAt >= day &&
                    item.StartAt < nextDay)
                .Select(item => item.StartAt)
                .ToListAsync(ct);

            return DefaultSlotTimes
                .Select(slot =>
                {
                    var start = day.Add(slot);
                    var end = start.AddMinutes(45);
                    return new ShowingAvailabilitySlot(
                        start,
                        end,
                        start > DateTime.UtcNow.AddHours(2) && !existing.Any(item => Math.Abs((item - start).TotalMinutes) < 15));
                })
                .ToList();
        }

        private async Task<ShowingBookingResponse> GetRequiredAsync(int id, CancellationToken ct)
        {
            return await db.ShowingBookings
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Agent)
                .Where(item => item.Id == id)
                .Select(item => new ShowingBookingResponse(
                    item.Id,
                    item.LeadId,
                    item.PropertyId,
                    item.Property == null ? "Property #" + item.PropertyId : item.Property.Title,
                    item.AgentId,
                    item.Agent == null ? string.Empty : item.Agent.FullName,
                    item.ContactName,
                    item.ContactEmail,
                    item.ContactPhone,
                    item.StartAt,
                    item.EndAt,
                    item.Status,
                    item.Notes,
                    item.CreatedAt,
                    item.UpdatedAt))
                .FirstOrDefaultAsync(ct)
                ?? throw new InvalidOperationException("Showing booking was not found after save.");
        }
    }
}
