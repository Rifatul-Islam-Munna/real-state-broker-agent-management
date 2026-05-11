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
        decimal CommissionAmount,
        DealCommissionStatus CommissionStatus,
        string CommissionPayoutNote,
        DealStage Stage,
        string Deadline,
        DateTime? ExpectedClosingDate,
        string Note,
        string Agent,
        int? AgentId,
        string? DealOwnerName,
        int? SourceLeadId,
        string? SourceLeadName,
        List<DealChecklistItemResponse> ChecklistItems,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record ConvertLeadToDealInput(int LeadId);

    public record DealChecklistItemResponse(
        int Id,
        string Title,
        bool IsCompleted,
        int SortOrder
    );

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
            await ResolveDealOwnerAsync(deal);
            await _db.DealPipelines.AddAsync(deal);
            await SyncLeadFromDealAsync(deal);
            await _db.SaveChangesAsync();
            return await GetRequiredDealResponseAsync(deal.Id);
        }

        public async Task<DealPipelineResponse?> UpdateDealAsync(DealPipeline deal)
        {
            var existing = await _db.DealPipelines
                .Include(item => item.ChecklistItems)
                .FirstOrDefaultAsync(item => item.Id == deal.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Title = (deal.Title ?? string.Empty).Trim();
            existing.Type = deal.Type;
            existing.Client = (deal.Client ?? string.Empty).Trim();
            existing.Value = deal.Value;
            existing.CommissionRate = deal.CommissionRate <= 0 ? existing.CommissionRate : deal.CommissionRate;
            existing.CommissionAmount = deal.CommissionAmount > 0
                ? deal.CommissionAmount
                : CalculateCommissionAmount(deal.Value, deal.CommissionRate <= 0 ? existing.CommissionRate : deal.CommissionRate);
            existing.CommissionStatus = deal.CommissionStatus;
            existing.CommissionPayoutNote = deal.CommissionPayoutNote ?? string.Empty;
            existing.Stage = deal.Stage;
            existing.Deadline = deal.Deadline ?? string.Empty;
            existing.ExpectedClosingDate = deal.ExpectedClosingDate?.ToUniversalTime();
            existing.Note = deal.Note ?? string.Empty;
            existing.Agent = (deal.Agent ?? string.Empty).Trim();
            existing.AgentId = deal.AgentId;
            existing.SourceLeadId = deal.SourceLeadId;
            existing.UpdatedAt = DateTime.UtcNow;

            await ResolveDealOwnerAsync(existing);
            _db.DealChecklistItems.RemoveRange(existing.ChecklistItems);
            ReplaceChecklistItems(existing, deal.ChecklistItems);
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
                .Include(item => item.DealOwner)
                .Include(item => item.ChecklistItems)
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
                .Include(item => item.DealOwner)
                .Include(item => item.ChecklistItems)
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
                AgentId = lead.AgentId,
                Client = lead.Name,
                CommissionRate = type == DealType.Commercial ? 4m : 3m,
                CommissionStatus = DealCommissionStatus.Estimated,
                CreatedAt = DateTime.UtcNow,
                Deadline = "Created from lead",
                ExpectedClosingDate = DateTime.UtcNow.AddDays(45),
                Note = $"Converted from lead {lead.Name}.",
                SourceLeadId = lead.Id,
                Stage = DealStage.OfferMade,
                Title = string.IsNullOrWhiteSpace(lead.Property) ? $"{lead.Name} Opportunity" : lead.Property,
                Type = type,
                UpdatedAt = DateTime.UtcNow,
                Value = ParseBudget(lead.Budget)
            };
            deal.CommissionAmount = CalculateCommissionAmount(deal.Value, deal.CommissionRate);

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
            lead.AgentId = deal.AgentId;
            lead.Budget = deal.Value > 0
                ? deal.Value.ToString("C0", CultureInfo.GetCultureInfo("en-US"))
                : lead.Budget;
            lead.InBoard = false;
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
                item.CommissionAmount,
                item.CommissionStatus,
                item.CommissionPayoutNote,
                item.Stage,
                item.Deadline,
                item.ExpectedClosingDate,
                item.Note,
                item.Agent,
                item.AgentId,
                item.DealOwner != null ? item.DealOwner.FullName : null,
                item.SourceLeadId,
                item.SourceLead != null ? item.SourceLead.Name : null,
                item.ChecklistItems
                    .OrderBy(checklist => checklist.SortOrder)
                    .ThenBy(checklist => checklist.Id)
                    .Select(checklist => new DealChecklistItemResponse(
                        checklist.Id,
                        checklist.Title,
                        checklist.IsCompleted,
                        checklist.SortOrder))
                    .ToList(),
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
                item.CommissionAmount,
                item.CommissionStatus,
                item.CommissionPayoutNote,
                item.Stage,
                item.Deadline,
                item.ExpectedClosingDate,
                item.Note,
                item.Agent,
                item.AgentId,
                item.DealOwner?.FullName,
                item.SourceLeadId,
                item.SourceLead?.Name,
                item.ChecklistItems
                    .OrderBy(checklist => checklist.SortOrder)
                    .ThenBy(checklist => checklist.Id)
                    .Select(checklist => new DealChecklistItemResponse(
                        checklist.Id,
                        checklist.Title,
                        checklist.IsCompleted,
                        checklist.SortOrder))
                    .ToList(),
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static void NormalizeDeal(DealPipeline deal, bool isNew)
        {
            deal.Title = (deal.Title ?? string.Empty).Trim();
            deal.Client = (deal.Client ?? string.Empty).Trim();
            deal.Agent = (deal.Agent ?? string.Empty).Trim();
            deal.ExpectedClosingDate = deal.ExpectedClosingDate?.ToUniversalTime();
            deal.CommissionPayoutNote = (deal.CommissionPayoutNote ?? string.Empty).Trim();
            deal.CommissionAmount = deal.CommissionAmount > 0
                ? deal.CommissionAmount
                : CalculateCommissionAmount(deal.Value, deal.CommissionRate);
            ReplaceChecklistItems(deal, deal.ChecklistItems);

            var now = DateTime.UtcNow;
            deal.UpdatedAt = now;

            if (isNew)
            {
                deal.CreatedAt = now;
            }
        }

        private async Task ResolveDealOwnerAsync(DealPipeline deal)
        {
            if (deal.AgentId.HasValue)
            {
                var agent = await _db.Users.AsNoTracking().FirstOrDefaultAsync(item =>
                    item.Id == deal.AgentId &&
                    item.Role == UserRole.Agent &&
                    item.DeletedAt == null);

                if (agent is not null)
                {
                    deal.Agent = agent.FullName;
                    return;
                }

                deal.AgentId = null;
            }

            if (string.IsNullOrWhiteSpace(deal.Agent))
            {
                return;
            }

            var normalizedAgent = deal.Agent.Trim().ToLowerInvariant();
            var namedAgent = await _db.Users.AsNoTracking().FirstOrDefaultAsync(item =>
                item.Role == UserRole.Agent &&
                item.DeletedAt == null &&
                (((item.FirstName ?? string.Empty) + " " + (item.LastName ?? string.Empty)).ToLower() == normalizedAgent ||
                 item.Email.ToLower() == normalizedAgent));

            if (namedAgent is not null)
            {
                deal.AgentId = namedAgent.Id;
                deal.Agent = namedAgent.FullName;
            }
        }

        private static decimal CalculateCommissionAmount(decimal value, decimal commissionRate)
        {
            return value <= 0 || commissionRate <= 0 ? 0 : Math.Round(value * (commissionRate / 100m), 2);
        }

        private static void ReplaceChecklistItems(DealPipeline deal, List<DealChecklistItem>? source)
        {
            var now = DateTime.UtcNow;
            deal.ChecklistItems = (source ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.Title))
                .Select((item, index) => new DealChecklistItem
                {
                    CreatedAt = item.CreatedAt == default ? now : item.CreatedAt,
                    IsCompleted = item.IsCompleted,
                    SortOrder = item.SortOrder <= 0 ? index + 1 : item.SortOrder,
                    Title = item.Title.Trim(),
                    UpdatedAt = now,
                })
                .OrderBy(item => item.SortOrder)
                .ToList();
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
