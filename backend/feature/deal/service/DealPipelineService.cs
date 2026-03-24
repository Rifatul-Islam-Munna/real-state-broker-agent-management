using System.Globalization;
using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record DealPipelineResponse(
        int Id,
        string Title,
        DealType Type,
        string Client,
        decimal Value,
        decimal CommissionRate,
        DealStage Stage,
        string Deadline,
        string Note,
        string Agent,
        int? SourceLeadId,
        string? SourceLeadName,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ConvertLeadToDealInput(int LeadId);

    public class DealPipelineService
    {
        private readonly AppDbContext _db;

        public DealPipelineService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<DealPipelineResponse> CreateDealAsync(DealPipeline deal)
        {
            NormalizeDeal(deal, isNew: true);
            await _db.DealPipelines.AddAsync(deal);
            await SyncLeadFromDealAsync(deal);
            await _db.SaveChangesAsync();
            return await GetRequiredDealResponseAsync(deal.Id);
        }

        public async Task<DealPipelineResponse?> UpdateDealAsync(DealPipeline deal)
        {
            var existing = await _db.DealPipelines.FindAsync(deal.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Title = (deal.Title ?? string.Empty).Trim();
            existing.Type = deal.Type;
            existing.Client = (deal.Client ?? string.Empty).Trim();
            existing.Value = deal.Value;
            existing.CommissionRate = deal.CommissionRate <= 0 ? existing.CommissionRate : deal.CommissionRate;
            existing.Stage = deal.Stage;
            existing.Deadline = deal.Deadline ?? string.Empty;
            existing.Note = deal.Note ?? string.Empty;
            existing.Agent = (deal.Agent ?? string.Empty).Trim();
            existing.SourceLeadId = deal.SourceLeadId;
            existing.UpdatedAt = DateTime.UtcNow;

            await SyncLeadFromDealAsync(existing);
            await _db.SaveChangesAsync();
            return await GetRequiredDealResponseAsync(existing.Id);
        }

        public async Task DeleteDealAsync(int id)
        {
            var existing = await _db.DealPipelines.FindAsync(id);

            if (existing is null)
            {
                return;
            }

            _db.DealPipelines.Remove(existing);
            await _db.SaveChangesAsync();
        }

        public async Task<DealPipelineResponse?> GetDealAsync(int id)
        {
            return await _db.DealPipelines
                .Include(item => item.SourceLead)
                .Where(item => item.Id == id)
                .Select(MapDeal())
                .FirstOrDefaultAsync();
        }

        public async Task<PaginatedResult<DealPipelineResponse>> GetAllDealsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            DealStage? stage = null)
        {
            var query = _db.DealPipelines
                .Include(item => item.SourceLead)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Title ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Client ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Agent ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Note ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            if (stage.HasValue)
            {
                query = query.Where(item => item.Stage == stage.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(MapDeal())
                .ToListAsync();

            return new PaginatedResult<DealPipelineResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<DealPipelineResponse?> ConvertLeadToDealAsync(int leadId)
        {
            var existing = await _db.DealPipelines
                .Include(item => item.SourceLead)
                .FirstOrDefaultAsync(item => item.SourceLeadId == leadId);

            if (existing is not null)
            {
                return MapDealToResponse(existing);
            }

            var lead = await _db.Leads.FindAsync(leadId);

            if (lead is null)
            {
                return null;
            }

            var type = InferDealType(lead);
            var deal = new DealPipeline
            {
                Agent = lead.Agent,
                Client = lead.Name,
                CommissionRate = type == DealType.Commercial ? 4m : 3m,
                CreatedAt = DateTime.UtcNow,
                Deadline = "Created from lead",
                Note = $"Converted from lead {lead.Name}.",
                SourceLeadId = lead.Id,
                Stage = DealStage.OfferMade,
                Title = string.IsNullOrWhiteSpace(lead.Property) ? $"{lead.Name} Opportunity" : lead.Property,
                Type = type,
                UpdatedAt = DateTime.UtcNow,
                Value = ParseBudget(lead.Budget)
            };

            await _db.DealPipelines.AddAsync(deal);
            await SyncLeadFromDealAsync(deal);
            await _db.SaveChangesAsync();

            return await GetRequiredDealResponseAsync(deal.Id);
        }

        private async Task<DealPipelineResponse> GetRequiredDealResponseAsync(int id)
        {
            return await GetDealAsync(id)
                ?? throw new InvalidOperationException("Deal was not found after save.");
        }

        private async Task SyncLeadFromDealAsync(DealPipeline deal)
        {
            if (!deal.SourceLeadId.HasValue)
            {
                return;
            }

            var lead = await _db.Leads.FindAsync(deal.SourceLeadId.Value);

            if (lead is null)
            {
                return;
            }

            lead.Agent = deal.Agent;
            lead.Budget = deal.Value > 0
                ? deal.Value.ToString("C0", CultureInfo.GetCultureInfo("en-US"))
                : lead.Budget;
            lead.InBoard = true;
            lead.LastActivityAt = DateTime.UtcNow;
            lead.Name = deal.Client;
            lead.Property = deal.Title;
            lead.Stage = deal.Stage == DealStage.Canceled ? LeadStage.Canceled : LeadStage.Deal;
            lead.UpdatedAt = DateTime.UtcNow;
        }

        private static Expression<Func<DealPipeline, DealPipelineResponse>> MapDeal()
        {
            return item => new DealPipelineResponse(
                item.Id,
                item.Title,
                item.Type,
                item.Client,
                item.Value,
                item.CommissionRate,
                item.Stage,
                item.Deadline,
                item.Note,
                item.Agent,
                item.SourceLeadId,
                item.SourceLead != null ? item.SourceLead.Name : null,
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static DealPipelineResponse MapDealToResponse(DealPipeline item)
        {
            return new DealPipelineResponse(
                item.Id,
                item.Title,
                item.Type,
                item.Client,
                item.Value,
                item.CommissionRate,
                item.Stage,
                item.Deadline,
                item.Note,
                item.Agent,
                item.SourceLeadId,
                item.SourceLead?.Name,
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static void NormalizeDeal(DealPipeline deal, bool isNew)
        {
            deal.Title = (deal.Title ?? string.Empty).Trim();
            deal.Client = (deal.Client ?? string.Empty).Trim();
            deal.Agent = (deal.Agent ?? string.Empty).Trim();

            var now = DateTime.UtcNow;
            deal.UpdatedAt = now;

            if (isNew)
            {
                deal.CreatedAt = now;
            }
        }

        private static decimal ParseBudget(string budget)
        {
            if (string.IsNullOrWhiteSpace(budget ?? string.Empty))
            {
                return 0m;
            }

            var matches = Regex.Matches((budget ?? string.Empty).ToUpperInvariant(), @"(\d+(?:\.\d+)?)\s*([MK])?");

            if (matches.Count == 0)
            {
                return 0m;
            }

            var values = matches
                .Select(match =>
                {
                    var numeric = decimal.Parse(match.Groups[1].Value, CultureInfo.InvariantCulture);
                    var unit = match.Groups[2].Value;

                    return unit switch
                    {
                        "M" => numeric * 1_000_000m,
                        "K" => numeric * 1_000m,
                        _ => numeric
                    };
                })
                .ToList();

            return values.Count == 0 ? 0m : values.Average();
        }

        private static DealType InferDealType(Lead lead)
        {
            var text = $"{lead.Interest ?? string.Empty} {lead.Property ?? string.Empty}".ToLowerInvariant();

            if (text.Contains("office") || text.Contains("retail") || text.Contains("commercial"))
            {
                return DealType.Commercial;
            }

            if (text.Contains("industrial") || text.Contains("warehouse") || text.Contains("factory"))
            {
                return DealType.Industrial;
            }

            return DealType.Residential;
        }
    }
}
