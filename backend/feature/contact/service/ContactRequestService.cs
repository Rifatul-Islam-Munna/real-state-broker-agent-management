using System.Linq.Expressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record ContactRequestResponse(
        int Id,
        string Name,
        string Email,
        string Phone,
        string Message,
        string InquiryType,
        ContactRequestStatus Status,
        int? LeadId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ConvertContactRequestInput(int ContactRequestId);

    public class ContactRequestService
    {
        private readonly AppDbContext _db;

        public ContactRequestService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<ContactRequestResponse> CreateContactRequestAsync(ContactRequest request)
        {
            NormalizeRequest(request, isNew: true);
            await _db.ContactRequests.AddAsync(request);
            await _db.SaveChangesAsync();
            return await GetRequiredContactRequestResponseAsync(request.Id);
        }

        public async Task<ContactRequestResponse?> UpdateContactRequestAsync(ContactRequest request)
        {
            var existing = await _db.ContactRequests.FindAsync(request.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Name = (request.Name ?? string.Empty).Trim();
            existing.Email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
            existing.Phone = (request.Phone ?? string.Empty).Trim();
            existing.Message = request.Message ?? string.Empty;
            existing.InquiryType = (request.InquiryType ?? string.Empty).Trim();
            existing.Status = request.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await GetRequiredContactRequestResponseAsync(existing.Id);
        }

        public async Task DeleteContactRequestAsync(int id)
        {
            var existing = await _db.ContactRequests.FindAsync(id);

            if (existing is null)
            {
                return;
            }

            _db.ContactRequests.Remove(existing);
            await _db.SaveChangesAsync();
        }

        public async Task<ContactRequestResponse?> GetContactRequestAsync(int id)
        {
            return await _db.ContactRequests
                .Where(item => item.Id == id)
                .Select(MapContactRequest())
                .FirstOrDefaultAsync();
        }

        public async Task<PaginatedResult<ContactRequestResponse>> GetAllContactRequestsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            ContactRequestStatus? status = null)
        {
            var query = _db.ContactRequests.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Name ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Message ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.InquiryType ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            if (status.HasValue)
            {
                query = query.Where(item => item.Status == status.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapContactRequest())
                .ToListAsync();

            return new PaginatedResult<ContactRequestResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<LeadResponse?> ConvertToLeadAsync(int contactRequestId)
        {
            var contact = await _db.ContactRequests.FirstOrDefaultAsync(item => item.Id == contactRequestId);

            if (contact is null)
            {
                return null;
            }

            var normalizedEmail = (contact.Email ?? string.Empty).Trim().ToLowerInvariant();
            var lead = await _db.Leads
                .FirstOrDefaultAsync(item => item.Id == contact.LeadId || item.Email == normalizedEmail);

            if (lead is null)
            {
                var now = DateTime.UtcNow;
                lead = new Lead
                {
                    Agent = string.Empty,
                    Budget = string.Empty,
                    CreatedAt = now,
                    Email = normalizedEmail,
                    InBoard = false,
                    Interest = contact.InquiryType ?? string.Empty,
                    LastActivityAt = now,
                    Name = (contact.Name ?? string.Empty).Trim(),
                    Notes = [contact.Message ?? string.Empty],
                    Phone = (contact.Phone ?? string.Empty).Trim(),
                    Priority = LeadPriority.Warm,
                    Property = string.Empty,
                    Source = "Contact Us",
                    Stage = LeadStage.New,
                    Summary = contact.Message ?? string.Empty,
                    Timeline = string.Empty,
                    UpdatedAt = now,
                };

                await _db.Leads.AddAsync(lead);
                await _db.SaveChangesAsync();
            }

            contact.LeadId = lead.Id;
            contact.Status = ContactRequestStatus.Converted;
            contact.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return await _db.Leads
                .Include(item => item.Deals)
                .Where(item => item.Id == lead.Id)
                .Select(item => new LeadResponse(
                    item.Id,
                    item.Name,
                    item.Email,
                    item.Phone,
                    item.Summary,
                    item.Property,
                    item.Budget,
                    item.Stage,
                    item.Priority,
                    item.Agent,
                    item.Source,
                    item.Interest,
                    item.Timeline,
                    item.InBoard,
                    item.Notes,
                    item.CreatedAt,
                    item.UpdatedAt,
                    item.LastActivityAt,
                    item.Deals
                        .OrderByDescending(deal => deal.CreatedAt)
                        .Select(deal => (int?)deal.Id)
                        .FirstOrDefault(),
                    item.Deals
                        .OrderByDescending(deal => deal.CreatedAt)
                        .Select(deal => deal.Title)
                        .FirstOrDefault()
                ))
                .FirstOrDefaultAsync();
        }

        private async Task<ContactRequestResponse> GetRequiredContactRequestResponseAsync(int id)
        {
            return await GetContactRequestAsync(id)
                ?? throw new InvalidOperationException("Contact request was not found after save.");
        }

        private static Expression<Func<ContactRequest, ContactRequestResponse>> MapContactRequest()
        {
            return item => new ContactRequestResponse(
                item.Id,
                item.Name,
                item.Email,
                item.Phone,
                item.Message,
                item.InquiryType,
                item.Status,
                item.LeadId,
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static void NormalizeRequest(ContactRequest request, bool isNew)
        {
            request.Name = (request.Name ?? string.Empty).Trim();
            request.Email = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
            request.Phone = (request.Phone ?? string.Empty).Trim();
            request.InquiryType = (request.InquiryType ?? string.Empty).Trim();

            var now = DateTime.UtcNow;
            request.UpdatedAt = now;

            if (isNew)
            {
                request.Status = ContactRequestStatus.New;
                request.CreatedAt = now;
            }
        }
    }
}
