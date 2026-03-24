using System.Linq.Expressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record LeadResponse(
        int Id,
        string Name,
        string Email,
        string Phone,
        string Summary,
        string Property,
        string Budget,
        LeadStage Stage,
        LeadPriority Priority,
        string Agent,
        string Source,
        string Interest,
        string Timeline,
        bool InBoard,
        List<string> Notes,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        DateTime LastActivityAt,
        int? LinkedDealId,
        string? LinkedDealTitle
    );

    public class LeadService
    {
        private readonly AppDbContext _db;

        public LeadService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<LeadResponse> CreateLeadAsync(Lead lead)
        {
            NormalizeLead(lead, isNew: true);
            await _db.Leads.AddAsync(lead);
            await _db.SaveChangesAsync();
            return await GetRequiredLeadResponseAsync(lead.Id);
        }

        public async Task<LeadResponse?> UpdateLeadAsync(Lead lead)
        {
            var existing = await _db.Leads.FindAsync(lead.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Name = (lead.Name ?? string.Empty).Trim();
            existing.Email = (lead.Email ?? string.Empty).Trim().ToLowerInvariant();
            existing.Phone = (lead.Phone ?? string.Empty).Trim();
            existing.Summary = lead.Summary ?? string.Empty;
            existing.Property = lead.Property ?? string.Empty;
            existing.Budget = lead.Budget ?? string.Empty;
            existing.Stage = lead.Stage;
            existing.Priority = lead.Priority;
            existing.Agent = (lead.Agent ?? string.Empty).Trim();
            existing.Source = (lead.Source ?? string.Empty).Trim();
            existing.Interest = lead.Interest ?? string.Empty;
            existing.Timeline = lead.Timeline ?? string.Empty;
            existing.InBoard = lead.InBoard;
            existing.Notes = lead.Notes ?? [];
            existing.UpdatedAt = DateTime.UtcNow;
            existing.LastActivityAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await GetRequiredLeadResponseAsync(existing.Id);
        }

        public async Task DeleteLeadAsync(int id)
        {
            var lead = await _db.Leads.FindAsync(id);

            if (lead is null)
            {
                return;
            }

            _db.Leads.Remove(lead);
            await _db.SaveChangesAsync();
        }

        public async Task<LeadResponse?> GetLeadAsync(int id)
        {
            return await _db.Leads
                .Include(item => item.Deals)
                .Where(item => item.Id == id)
                .Select(MapLead())
                .FirstOrDefaultAsync();
        }

        public async Task<LeadResponse?> GetLeadByEmailAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();

            return await _db.Leads
                .Include(item => item.Deals)
                .Where(item => item.Email == normalizedEmail)
                .Select(MapLead())
                .FirstOrDefaultAsync();
        }

        public async Task<PaginatedResult<LeadResponse>> GetAllLeadsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            LeadStage? stage = null)
        {
            var query = _db.Leads
                .Include(item => item.Deals)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Name ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Property ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Agent ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            if (stage.HasValue)
            {
                query = query.Where(item => item.Stage == stage.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.LastActivityAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapLead())
                .ToListAsync();

            return new PaginatedResult<LeadResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        private async Task<LeadResponse> GetRequiredLeadResponseAsync(int leadId)
        {
            return await GetLeadAsync(leadId)
                ?? throw new InvalidOperationException("Lead was not found after save.");
        }

        private static Expression<Func<Lead, LeadResponse>> MapLead()
        {
            return item => new LeadResponse(
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
            );
        }

        private static void NormalizeLead(Lead lead, bool isNew)
        {
            lead.Name = (lead.Name ?? string.Empty).Trim();
            lead.Email = (lead.Email ?? string.Empty).Trim().ToLowerInvariant();
            lead.Phone = (lead.Phone ?? string.Empty).Trim();
            lead.Agent = (lead.Agent ?? string.Empty).Trim();
            lead.Source = (lead.Source ?? string.Empty).Trim();
            lead.Notes ??= [];

            var now = DateTime.UtcNow;
            lead.UpdatedAt = now;
            lead.LastActivityAt = now;

            if (isNew)
            {
                lead.CreatedAt = now;
            }
        }
    }
}
