using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public record LeadAssignmentContext(
        int? PropertyId,
        string PropertyTitle,
        string Location,
        PropertyCategory? PropertyType,
        PropertyListingType? ListingType
    );

    public record LeadAssignmentRuleResponse(
        int Id,
        string Area,
        PropertyCategory? PropertyType,
        PropertyListingType? ListingType,
        int AgentId,
        string AgentName,
        int PriorityOrder,
        bool IsActive,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public class LeadAssignmentService(AppDbContext db)
    {
        public async Task ApplyAssignmentAsync(Lead lead, LeadAssignmentContext? context = null, CancellationToken ct = default)
        {
            if (lead.AgentId.HasValue)
            {
                var assigned = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(item => item.Id == lead.AgentId && item.Role == UserRole.Agent && item.DeletedAt == null, ct);

                if (assigned is not null)
                {
                    lead.Agent = assigned.FullName;
                    return;
                }

                lead.AgentId = null;
            }

            if (!string.IsNullOrWhiteSpace(lead.Agent))
            {
                var normalizedAgent = lead.Agent.Trim().ToLowerInvariant();
                var namedAgent = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(item =>
                        item.Role == UserRole.Agent &&
                        item.DeletedAt == null &&
                        (((item.FirstName ?? string.Empty) + " " + (item.LastName ?? string.Empty)).ToLower() == normalizedAgent ||
                         item.Email.ToLower() == normalizedAgent), ct);

                if (namedAgent is not null)
                {
                    lead.AgentId = namedAgent.Id;
                    lead.Agent = namedAgent.FullName;
                    return;
                }
            }

            var resolved = await ResolveAgentAsync(context ?? LeadToContext(lead), ct);
            if (resolved is null)
            {
                return;
            }

            lead.AgentId = resolved.Id;
            lead.Agent = resolved.FullName;
        }

        public async Task<User?> ResolveAgentAsync(LeadAssignmentContext context, CancellationToken ct = default)
        {
            var listingAgent = await ResolveListingAgentAsync(context, ct);
            if (listingAgent is not null)
            {
                return listingAgent;
            }

            var ruleAgent = await ResolveRuleAgentAsync(context, ct);
            if (ruleAgent is not null)
            {
                return ruleAgent;
            }

            return await ResolveLowestWorkloadAgentAsync(ct);
        }

        public async Task<List<LeadAssignmentRuleResponse>> GetRulesAsync(CancellationToken ct = default)
        {
            return await db.LeadAssignmentRules
                .AsNoTracking()
                .Include(item => item.Agent)
                .OrderBy(item => item.PriorityOrder)
                .ThenBy(item => item.Area)
                .Select(item => new LeadAssignmentRuleResponse(
                    item.Id,
                    item.Area,
                    item.PropertyType,
                    item.ListingType,
                    item.AgentId,
                    item.Agent == null ? $"Agent #{item.AgentId}" : item.Agent.FullName,
                    item.PriorityOrder,
                    item.IsActive,
                    item.CreatedAt,
                    item.UpdatedAt))
                .ToListAsync(ct);
        }

        public async Task<LeadAssignmentRuleResponse> SaveRuleAsync(LeadAssignmentRule rule, CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            LeadAssignmentRule entity;

            if (rule.Id > 0)
            {
                entity = await db.LeadAssignmentRules.FirstOrDefaultAsync(item => item.Id == rule.Id, ct)
                    ?? throw new InvalidOperationException("Assignment rule was not found.");
            }
            else
            {
                entity = new LeadAssignmentRule { CreatedAt = now };
                await db.LeadAssignmentRules.AddAsync(entity, ct);
            }

            entity.AgentId = rule.AgentId;
            entity.Area = (rule.Area ?? string.Empty).Trim();
            entity.IsActive = rule.IsActive;
            entity.ListingType = rule.ListingType;
            entity.PriorityOrder = rule.PriorityOrder <= 0 ? 100 : rule.PriorityOrder;
            entity.PropertyType = rule.PropertyType;
            entity.UpdatedAt = now;

            await db.SaveChangesAsync(ct);
            return (await GetRulesAsync(ct)).First(item => item.Id == entity.Id);
        }

        public async Task DeleteRuleAsync(int id, CancellationToken ct = default)
        {
            var rule = await db.LeadAssignmentRules.FirstOrDefaultAsync(item => item.Id == id, ct);
            if (rule is null)
            {
                return;
            }

            db.LeadAssignmentRules.Remove(rule);
            await db.SaveChangesAsync(ct);
        }

        private async Task<User?> ResolveListingAgentAsync(LeadAssignmentContext context, CancellationToken ct)
        {
            if (context.PropertyId.HasValue)
            {
                var property = await db.Properties
                    .AsNoTracking()
                    .Include(item => item.Agent)
                    .FirstOrDefaultAsync(item => item.Id == context.PropertyId.Value, ct);

                if (property?.Agent is { IsActive: true, DeletedAt: null })
                {
                    return property.Agent;
                }
            }

            var title = (context.PropertyTitle ?? string.Empty).Trim().ToLowerInvariant();
            if (title.Length == 0)
            {
                return null;
            }

            var titleMatch = await db.Properties
                .AsNoTracking()
                .Include(item => item.Agent)
                .Where(item => item.AgentId != null && item.Title.ToLower() == title)
                .OrderByDescending(item => item.UpdatedAt)
                .FirstOrDefaultAsync(ct);

            return titleMatch?.Agent is { IsActive: true, DeletedAt: null } ? titleMatch.Agent : null;
        }

        private async Task<User?> ResolveRuleAgentAsync(LeadAssignmentContext context, CancellationToken ct)
        {
            var areaText = $"{context.Location} {context.PropertyTitle}".ToLowerInvariant();
            var rules = await db.LeadAssignmentRules
                .AsNoTracking()
                .Include(item => item.Agent)
                .Where(item => item.IsActive && item.Agent != null && item.Agent.IsActive && item.Agent.DeletedAt == null)
                .OrderBy(item => item.PriorityOrder)
                .ThenBy(item => item.Id)
                .ToListAsync(ct);

            foreach (var rule in rules)
            {
                var areaMatches = string.IsNullOrWhiteSpace(rule.Area) ||
                    areaText.Contains(rule.Area.Trim().ToLowerInvariant());
                var propertyTypeMatches = !rule.PropertyType.HasValue || rule.PropertyType == context.PropertyType;
                var listingTypeMatches = !rule.ListingType.HasValue || rule.ListingType == context.ListingType;

                if (areaMatches && propertyTypeMatches && listingTypeMatches && rule.Agent is not null)
                {
                    return rule.Agent;
                }
            }

            return null;
        }

        private async Task<User?> ResolveLowestWorkloadAgentAsync(CancellationToken ct)
        {
            var agents = await db.Users
                .AsNoTracking()
                .Where(item => item.Role == UserRole.Agent && item.IsActive && item.DeletedAt == null)
                .Select(item => new
                {
                    Agent = item,
                    LeadCount = db.Leads.Count(lead =>
                        lead.AgentId == item.Id &&
                        lead.Stage != LeadStage.Deal &&
                        lead.Stage != LeadStage.Canceled),
                    PropertyCount = db.Properties.Count(property =>
                        property.AgentId == item.Id &&
                        (property.Status == PropertyStatus.Open ||
                         property.Status == PropertyStatus.Active ||
                         property.Status == PropertyStatus.UnderOffer)),
                    ShowingCount = db.ShowingBookings.Count(showing =>
                        showing.AgentId == item.Id &&
                        showing.Status == ShowingBookingStatus.Scheduled)
                })
                .ToListAsync(ct);

            return agents
                .OrderBy(item => item.LeadCount + item.PropertyCount + item.ShowingCount)
                .ThenBy(item => item.Agent.FirstName)
                .ThenBy(item => item.Agent.LastName)
                .Select(item => item.Agent)
                .FirstOrDefault();
        }

        private static LeadAssignmentContext LeadToContext(Lead lead)
        {
            return new LeadAssignmentContext(
                null,
                lead.Property ?? string.Empty,
                string.Empty,
                null,
                null);
        }
    }
}
