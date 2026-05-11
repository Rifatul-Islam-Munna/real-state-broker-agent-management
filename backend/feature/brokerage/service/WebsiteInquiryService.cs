using Data;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record WebsiteInquiryResponse(
        string Id,
        string Kind,
        string Source,
        string ContactName,
        string ContactEmail,
        string ContactPhone,
        string PropertyTitle,
        string AssignedAgent,
        int? LeadId,
        string Status,
        string Summary,
        DateTime CreatedAt
    );

    public class WebsiteInquiryService(AppDbContext db)
    {
        public async Task<PaginatedResult<WebsiteInquiryResponse>> GetAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            CancellationToken ct = default)
        {
            var normalizedSearch = (search ?? string.Empty).Trim().ToLowerInvariant();

            var contacts = await db.ContactRequests
                .AsNoTracking()
                .Select(item => new WebsiteInquiryResponse(
                    "contact-" + item.Id,
                    "Contact",
                    "Contact Form",
                    item.Name,
                    item.Email,
                    item.Phone,
                    string.Empty,
                    string.Empty,
                    item.LeadId,
                    item.Status.ToString(),
                    item.Message,
                    item.CreatedAt))
                .ToListAsync(ct);

            var chats = await db.PropertyChatConversations
                .AsNoTracking()
                .Select(item => new WebsiteInquiryResponse(
                    "chat-" + item.Id,
                    "Property Chat",
                    "Property Chat",
                    item.ContactName,
                    item.ContactEmail,
                    item.ContactPhone,
                    item.PropertyTitle,
                    item.AssignedAgent,
                    item.LeadId,
                    item.Status.ToString(),
                    item.Summary,
                    item.CreatedAt))
                .ToListAsync(ct);

            var showings = await db.ShowingBookings
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.Agent)
                .Select(item => new WebsiteInquiryResponse(
                    "showing-" + item.Id,
                    "Showing",
                    "Schedule Viewing",
                    item.ContactName,
                    item.ContactEmail,
                    item.ContactPhone,
                    item.Property == null ? "Property #" + item.PropertyId : item.Property.Title,
                    item.Agent == null ? string.Empty : item.Agent.FullName,
                    item.LeadId,
                    item.Status.ToString(),
                    item.Notes,
                    item.CreatedAt))
                .ToListAsync(ct);

            var allItems = contacts
                .Concat(chats)
                .Concat(showings)
                .Where(item =>
                    normalizedSearch.Length == 0 ||
                    item.ContactName.ToLowerInvariant().Contains(normalizedSearch) ||
                    item.ContactEmail.ToLowerInvariant().Contains(normalizedSearch) ||
                    item.ContactPhone.ToLowerInvariant().Contains(normalizedSearch) ||
                    item.PropertyTitle.ToLowerInvariant().Contains(normalizedSearch) ||
                    item.Source.ToLowerInvariant().Contains(normalizedSearch) ||
                    item.Summary.ToLowerInvariant().Contains(normalizedSearch))
                .OrderByDescending(item => item.CreatedAt)
                .ToList();

            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);
            var totalCount = allItems.Count;

            return new PaginatedResult<WebsiteInquiryResponse>
            {
                Items = allItems
                    .Skip((normalizedPage - 1) * normalizedPageSize)
                    .Take(normalizedPageSize)
                    .ToList(),
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }
    }
}
