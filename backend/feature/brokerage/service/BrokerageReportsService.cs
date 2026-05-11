using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public record BrokerageSourcePerformanceItem(
        string Source,
        int LeadCount,
        int DealCount,
        decimal DealValue
    );

    public record BrokerageAgentConversionItem(
        int? AgentId,
        string AgentName,
        int LeadCount,
        int DealCount,
        decimal ConversionRate
    );

    public record BrokerageCommissionSummary(
        decimal EstimatedCommission,
        decimal PaidCommission,
        decimal OpenCommission
    );

    public record BrokerageReportsResponse(
        int LeadsThisMonth,
        List<BrokerageAgentConversionItem> ConversionByAgent,
        int ActiveListings,
        int SoldRentedCount,
        List<BrokerageSourcePerformanceItem> SourcePerformance,
        int OverdueFollowUps,
        BrokerageCommissionSummary CommissionSummary
    );

    public class BrokerageReportsService(AppDbContext db)
    {
        public async Task<BrokerageReportsResponse> GetAsync(CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var leads = await db.Leads
                .AsNoTracking()
                .ToListAsync(ct);
            var deals = await db.DealPipelines
                .AsNoTracking()
                .ToListAsync(ct);
            var properties = await db.Properties
                .AsNoTracking()
                .ToListAsync(ct);

            var dealsByLeadId = deals
                .Where(item => item.SourceLeadId.HasValue)
                .GroupBy(item => item.SourceLeadId!.Value)
                .ToDictionary(group => group.Key, group => group.ToList());

            var conversionByAgent = leads
                .GroupBy(item => new { item.AgentId, AgentName = string.IsNullOrWhiteSpace(item.Agent) ? "Unassigned" : item.Agent })
                .Select(group =>
                {
                    var leadIds = group.Select(item => item.Id).ToHashSet();
                    var agentDeals = deals.Where(item =>
                        (item.AgentId.HasValue && item.AgentId == group.Key.AgentId) ||
                        (item.SourceLeadId.HasValue && leadIds.Contains(item.SourceLeadId.Value))).ToList();

                    return new BrokerageAgentConversionItem(
                        group.Key.AgentId,
                        group.Key.AgentName,
                        group.Count(),
                        agentDeals.Count,
                        group.Count() == 0 ? 0 : Math.Round((agentDeals.Count / (decimal)group.Count()) * 100m, 1));
                })
                .OrderByDescending(item => item.DealCount)
                .ThenBy(item => item.AgentName)
                .ToList();

            var sourcePerformance = leads
                .GroupBy(item => string.IsNullOrWhiteSpace(item.Source) ? "Unknown" : item.Source)
                .Select(group =>
                {
                    var linkedDeals = group
                        .SelectMany(lead => dealsByLeadId.TryGetValue(lead.Id, out var leadDeals) ? leadDeals : [])
                        .ToList();

                    return new BrokerageSourcePerformanceItem(
                        group.Key,
                        group.Count(),
                        linkedDeals.Count,
                        linkedDeals.Sum(item => item.Value));
                })
                .OrderByDescending(item => item.DealCount)
                .ThenByDescending(item => item.LeadCount)
                .ToList();

            var estimatedCommission = deals.Sum(item =>
                item.CommissionAmount > 0 ? item.CommissionAmount : item.Value * (item.CommissionRate / 100m));
            var paidCommission = deals
                .Where(item => item.CommissionStatus == DealCommissionStatus.Paid)
                .Sum(item => item.CommissionAmount > 0 ? item.CommissionAmount : item.Value * (item.CommissionRate / 100m));

            return new BrokerageReportsResponse(
                leads.Count(item => item.CreatedAt >= startOfMonth),
                conversionByAgent,
                properties.Count(item => item.Status is PropertyStatus.Open or PropertyStatus.Active or PropertyStatus.UnderOffer),
                properties.Count(item => item.Status is PropertyStatus.Closed or PropertyStatus.Sold or PropertyStatus.Rented),
                sourcePerformance,
                leads.Count(item =>
                    item.NextActionDate.HasValue &&
                    item.NextActionDate.Value < now &&
                    item.FollowUpStatus is LeadFollowUpStatus.Open or LeadFollowUpStatus.Scheduled &&
                    item.Stage != LeadStage.Deal &&
                    item.Stage != LeadStage.Canceled),
                new BrokerageCommissionSummary(
                    Math.Round(estimatedCommission, 2),
                    Math.Round(paidCommission, 2),
                    Math.Round(estimatedCommission - paidCommission, 2)));
        }
    }
}
