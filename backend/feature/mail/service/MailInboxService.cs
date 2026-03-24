using System.Linq.Expressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record MailInboxResponse(
        int Id,
        string Email,
        string Name,
        string Subject,
        string Message,
        MailInboxKind Kind,
        MailInboxStatus Status,
        int? LeadId,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ConvertMailInboxInput(int MailInboxId);

    public class MailInboxService
    {
        private readonly AppDbContext _db;

        public MailInboxService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<MailInboxResponse> CreateMailInboxItemAsync(MailInboxItem item)
        {
            NormalizeItem(item, isNew: true);
            await _db.MailInbox.AddAsync(item);
            await _db.SaveChangesAsync();
            return await GetRequiredMailInboxResponseAsync(item.Id);
        }

        public async Task<MailInboxResponse?> UpdateMailInboxItemAsync(MailInboxItem item)
        {
            var existing = await _db.MailInbox.FindAsync(item.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Email = (item.Email ?? string.Empty).Trim().ToLowerInvariant();
            existing.Name = (item.Name ?? string.Empty).Trim();
            existing.Subject = (item.Subject ?? string.Empty).Trim();
            existing.Message = item.Message ?? string.Empty;
            existing.Kind = item.Kind;
            existing.Status = item.Status;
            existing.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await GetRequiredMailInboxResponseAsync(existing.Id);
        }

        public async Task DeleteMailInboxItemAsync(int id)
        {
            var existing = await _db.MailInbox.FindAsync(id);

            if (existing is null)
            {
                return;
            }

            _db.MailInbox.Remove(existing);
            await _db.SaveChangesAsync();
        }

        public async Task<MailInboxResponse?> GetMailInboxItemAsync(int id)
        {
            return await _db.MailInbox
                .Where(item => item.Id == id)
                .Select(MapMailInbox())
                .FirstOrDefaultAsync();
        }

        public async Task<PaginatedResult<MailInboxResponse>> GetAllMailInboxItemsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            MailInboxStatus? status = null)
        {
            var query = _db.MailInbox.AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Name ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Subject ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Message ?? string.Empty).ToLower().Contains(normalizedSearch));
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
                .Select(MapMailInbox())
                .ToListAsync();

            return new PaginatedResult<MailInboxResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<LeadResponse?> ConvertToLeadAsync(int mailInboxId)
        {
            var mailItem = await _db.MailInbox.FirstOrDefaultAsync(item => item.Id == mailInboxId);

            if (mailItem is null)
            {
                return null;
            }

            var normalizedEmail = (mailItem.Email ?? string.Empty).Trim().ToLowerInvariant();
            var lead = await _db.Leads
                .FirstOrDefaultAsync(item => item.Id == mailItem.LeadId || item.Email == normalizedEmail);

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
                    Interest = mailItem.Subject ?? string.Empty,
                    LastActivityAt = now,
                    Name = string.IsNullOrWhiteSpace(mailItem.Name) ? normalizedEmail.Split('@')[0] : (mailItem.Name ?? string.Empty).Trim(),
                    Notes = [mailItem.Message ?? string.Empty],
                    Phone = "Not provided",
                    Priority = mailItem.Kind == MailInboxKind.Direct ? LeadPriority.Warm : LeadPriority.FollowUp,
                    Property = string.Empty,
                    Source = mailItem.Kind == MailInboxKind.Newsletter ? "Mail Signup" : "Mail Inbox",
                    Stage = LeadStage.New,
                    Summary = mailItem.Message ?? string.Empty,
                    Timeline = string.Empty,
                    UpdatedAt = now,
                };

                await _db.Leads.AddAsync(lead);
                await _db.SaveChangesAsync();
            }

            mailItem.LeadId = lead.Id;
            mailItem.Status = MailInboxStatus.Converted;
            mailItem.UpdatedAt = DateTime.UtcNow;
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

        private async Task<MailInboxResponse> GetRequiredMailInboxResponseAsync(int id)
        {
            return await GetMailInboxItemAsync(id)
                ?? throw new InvalidOperationException("Mail inbox item was not found after save.");
        }

        private static Expression<Func<MailInboxItem, MailInboxResponse>> MapMailInbox()
        {
            return item => new MailInboxResponse(
                item.Id,
                item.Email,
                item.Name,
                item.Subject,
                item.Message,
                item.Kind,
                item.Status,
                item.LeadId,
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static void NormalizeItem(MailInboxItem item, bool isNew)
        {
            item.Email = (item.Email ?? string.Empty).Trim().ToLowerInvariant();
            item.Name = (item.Name ?? string.Empty).Trim();
            item.Subject = (item.Subject ?? string.Empty).Trim();

            var now = DateTime.UtcNow;
            item.UpdatedAt = now;

            if (isNew)
            {
                item.Status = MailInboxStatus.New;
                item.CreatedAt = now;
            }
        }
    }
}
