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
        int? AgentId,
        string? AssignedAgentName,
        string Source,
        string ShowingAgentName,
        string ShowingAgentEmail,
        string ShowingAgentPhone,
        string Interest,
        string Timeline,
        bool InBoard,
        DateTime? NextActionDate,
        string NextActionType,
        LeadFollowUpStatus FollowUpStatus,
        bool IsFollowUpOverdue,
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
        private readonly LeadAssignmentService _leadAssignmentService;
        private readonly BrokerageAuditService _auditService;

        public LeadService(
            AppDbContext db,
            LeadAssignmentService leadAssignmentService,
            BrokerageAuditService auditService)
        {
            _db = db;
            _leadAssignmentService = leadAssignmentService;
            _auditService = auditService;
        }

        public async Task<LeadResponse> CreateLeadAsync(Lead lead, string actor = "CRM")
        {
            NormalizeLead(lead, isNew: true);
            await _leadAssignmentService.ApplyAssignmentAsync(lead);
            await _db.Leads.AddAsync(lead);
            _auditService.AddLog("Lead", null, "Create", null, null, lead.Name, actor, lead.Source);
            await _db.SaveChangesAsync();
            return await GetRequiredLeadResponseAsync(lead.Id);
        }

        public async Task<LeadResponse?> UpdateLeadAsync(Lead lead, string actor = "CRM")
        {
            var existing = await _db.Leads.FindAsync(lead.Id);

            if (existing is null)
            {
                return null;
            }

            var oldStage = existing.Stage;
            var oldAgent = existing.Agent;
            var oldNextActionDate = existing.NextActionDate;

            existing.Name = (lead.Name ?? string.Empty).Trim();
            existing.Email = (lead.Email ?? string.Empty).Trim().ToLowerInvariant();
            existing.Phone = (lead.Phone ?? string.Empty).Trim();
            existing.Summary = lead.Summary ?? string.Empty;
            existing.Property = lead.Property ?? string.Empty;
            existing.Budget = lead.Budget ?? string.Empty;
            existing.Stage = lead.Stage;
            existing.Priority = lead.Priority;
            existing.Agent = (lead.Agent ?? string.Empty).Trim();
            existing.AgentId = lead.AgentId;
            existing.Source = (lead.Source ?? string.Empty).Trim();
            existing.ShowingAgentName = (lead.ShowingAgentName ?? string.Empty).Trim();
            existing.ShowingAgentEmail = (lead.ShowingAgentEmail ?? string.Empty).Trim().ToLowerInvariant();
            existing.ShowingAgentPhone = (lead.ShowingAgentPhone ?? string.Empty).Trim();
            existing.Interest = lead.Interest ?? string.Empty;
            existing.Timeline = lead.Timeline ?? string.Empty;
            existing.InBoard = lead.InBoard;
            existing.NextActionDate = lead.NextActionDate?.ToUniversalTime();
            existing.NextActionType = (lead.NextActionType ?? string.Empty).Trim();
            existing.FollowUpStatus = lead.FollowUpStatus;
            existing.Notes = lead.Notes ?? [];
            existing.UpdatedAt = DateTime.UtcNow;
            existing.LastActivityAt = DateTime.UtcNow;

            await _leadAssignmentService.ApplyAssignmentAsync(existing);

            if (oldStage != existing.Stage)
            {
                _auditService.AddLog("Lead", existing.Id, "Update", "stage", oldStage.ToString(), existing.Stage.ToString(), actor);
            }

            if (!string.Equals(oldAgent, existing.Agent, StringComparison.Ordinal))
            {
                _auditService.AddLog("Lead", existing.Id, "Update", "agent", oldAgent, existing.Agent, actor);
            }

            if (oldNextActionDate != existing.NextActionDate)
            {
                _auditService.AddLog(
                    "Lead",
                    existing.Id,
                    "Update",
                    "next_action_date",
                    oldNextActionDate?.ToString("O"),
                    existing.NextActionDate?.ToString("O"),
                    actor);
            }

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
                .Include(item => item.AssignedAgent)
                .Where(item => item.Id == id)
                .Select(MapLead())
                .FirstOrDefaultAsync();
        }

        public async Task<LeadResponse?> GetLeadByEmailAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();

            return await _db.Leads
                .Include(item => item.Deals)
                .Include(item => item.AssignedAgent)
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
                .Include(item => item.AssignedAgent)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Name ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Email ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Property ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Source ?? string.Empty).ToLower().Contains(normalizedSearch) ||
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
                item.AgentId,
                item.AssignedAgent != null ? item.AssignedAgent.FullName : null,
                item.Source,
                item.ShowingAgentName,
                item.ShowingAgentEmail,
                item.ShowingAgentPhone,
                item.Interest,
                item.Timeline,
                item.InBoard,
                item.NextActionDate,
                item.NextActionType,
                item.FollowUpStatus,
                item.NextActionDate != null &&
                    item.NextActionDate < DateTime.UtcNow &&
                    (item.FollowUpStatus == LeadFollowUpStatus.Open || item.FollowUpStatus == LeadFollowUpStatus.Scheduled) &&
                    item.Stage != LeadStage.Deal &&
                    item.Stage != LeadStage.Canceled,
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
            lead.ShowingAgentName = (lead.ShowingAgentName ?? string.Empty).Trim();
            lead.ShowingAgentEmail = (lead.ShowingAgentEmail ?? string.Empty).Trim().ToLowerInvariant();
            lead.ShowingAgentPhone = (lead.ShowingAgentPhone ?? string.Empty).Trim();
            lead.NextActionDate = lead.NextActionDate?.ToUniversalTime();
            lead.NextActionType = (lead.NextActionType ?? string.Empty).Trim();
            lead.Notes ??= [];

            if (lead.NextActionDate.HasValue && string.IsNullOrWhiteSpace(lead.NextActionType))
            {
                lead.NextActionType = "Follow up";
            }

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
