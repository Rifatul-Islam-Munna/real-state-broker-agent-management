using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public record DashboardOverviewResponse(
        int ActiveListings,
        decimal ActiveListingsChange,
        int NewLeadsThisWeek,
        int ContactedLeadsThisWeek,
        int ConvertedLeadsThisWeek,
        int DealsInProgress,
        int ClosingThisMonth,
        decimal MonthlyRevenue,
        decimal MonthlyRevenueChange
    );

    public record DashboardTopAgentResponse(
        int Id,
        string FullName,
        string Status,
        int DealsClosed,
        decimal Revenue,
        int Growth,
        string? AvatarUrl,
        string? AgencyName
    );

    public record DashboardAlertResponse(
        string Id,
        string Title,
        string Description,
        int Count,
        string Tone,
        string ActionLabel,
        string Target
    );

    public record DashboardVisitResponse(
        int Id,
        string PropertyTitle,
        string ClientName,
        DateTime ActivityAt,
        string? Timeline,
        string Status
    );

    public record DashboardSummaryResponse(
        DashboardOverviewResponse Overview,
        List<DashboardTopAgentResponse> TopAgents,
        List<DashboardAlertResponse> Alerts,
        List<DashboardVisitResponse> Visits
    );

    public class DashboardService(AppDbContext db)
    {
        public async Task<DashboardSummaryResponse> GetSummaryAsync()
        {
            var now = DateTime.UtcNow;
            var startOfWeek = StartOfWeek(now, DayOfWeek.Monday);
            var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var startOfPreviousMonth = startOfMonth.AddMonths(-1);

            var properties = await db.Properties
                .AsNoTracking()
                .ToListAsync();
            var leads = await db.Leads
                .AsNoTracking()
                .ToListAsync();
            var deals = await db.DealPipelines
                .AsNoTracking()
                .ToListAsync();
            var contactRequests = await db.ContactRequests
                .AsNoTracking()
                .ToListAsync();
            var mailInbox = await db.MailInbox
                .AsNoTracking()
                .ToListAsync();
            var agents = await db.Users
                .AsNoTracking()
                .Where(user => user.Role == UserRole.Agent && user.DeletedAt == null)
                .ToListAsync();

            var currentMonthListings = properties.Count(item => item.CreatedAt >= startOfMonth);
            var previousMonthListings = properties.Count(item =>
                item.CreatedAt >= startOfPreviousMonth &&
                item.CreatedAt < startOfMonth);

            var weeklyLeads = leads
                .Where(item => item.CreatedAt >= startOfWeek)
                .ToList();

            var currentMonthRevenue = deals
                .Where(item => item.Stage != DealStage.Canceled && item.CreatedAt >= startOfMonth)
                .Sum(item => item.Value);
            var previousMonthRevenue = deals
                .Where(item =>
                    item.Stage != DealStage.Canceled &&
                    item.CreatedAt >= startOfPreviousMonth &&
                    item.CreatedAt < startOfMonth)
                .Sum(item => item.Value);

            var topAgentCandidates = agents
                .Select(agent =>
                {
                    var agentDeals = deals
                        .Where(item => string.Equals(item.Agent, agent.FullName, StringComparison.OrdinalIgnoreCase))
                        .ToList();

                    var revenue = agentDeals
                        .Where(item => item.Stage != DealStage.Canceled)
                        .Sum(item => item.Value);
                    var activePropertyCount = properties.Count(item => item.AgentId == agent.Id && item.Status == PropertyStatus.Open);

                    return new
                    {
                        Agent = agent,
                        DealsClosed = agentDeals.Count(item => item.Stage == DealStage.Completed),
                        Revenue = revenue,
                        ActivePropertyCount = activePropertyCount
                    };
                })
                .ToList();

            var maxRevenue = topAgentCandidates.Count == 0 ? 0m : topAgentCandidates.Max(item => item.Revenue);
            var maxPropertyCount = topAgentCandidates.Count == 0 ? 0 : topAgentCandidates.Max(item => item.ActivePropertyCount);

            var topAgents = topAgentCandidates
                .OrderByDescending(item => item.Revenue)
                .ThenByDescending(item => item.DealsClosed)
                .ThenBy(item => item.Agent.FirstName)
                .Take(5)
                .Select(item => new DashboardTopAgentResponse(
                    item.Agent.Id,
                    item.Agent.FullName,
                    item.Agent.IsActive ? "Active" : "Inactive",
                    item.DealsClosed,
                    item.Revenue,
                    CalculateGrowthScore(item.Revenue, maxRevenue, item.ActivePropertyCount, maxPropertyCount),
                    item.Agent.AvatarUrl,
                    item.Agent.AgencyName
                ))
                .ToList();

            var pendingDealsCount = deals.Count(item =>
                item.Stage == DealStage.OfferAccepted ||
                item.Stage == DealStage.UnderContract ||
                item.Stage == DealStage.Inspection ||
                item.Stage == DealStage.Financing ||
                item.Stage == DealStage.Closing);

            var pendingLeadFollowUps = leads.Count(item =>
                    item.Stage == LeadStage.New ||
                    item.Stage == LeadStage.Contacted ||
                    item.Stage == LeadStage.Visit) +
                contactRequests.Count(item => item.Status == ContactRequestStatus.New) +
                mailInbox.Count(item => item.Status == MailInboxStatus.New);

            var alerts = new List<DashboardAlertResponse>
            {
                new(
                    "pipeline-follow-up",
                    $"{pendingDealsCount} Deals Need Attention",
                    pendingDealsCount == 0
                        ? "The current deal pipeline is clear."
                        : "Offer and closing stages have active items that should be reviewed today.",
                    pendingDealsCount,
                    pendingDealsCount > 0 ? "warning" : "info",
                    "Review Pipeline",
                    "deals"
                ),
                new(
                    "lead-follow-up",
                    $"{pendingLeadFollowUps} Leads And Inquiries Waiting",
                    pendingLeadFollowUps == 0
                        ? "No fresh lead follow-up is pending."
                        : "New leads, contact requests, or inbox inquiries are waiting for a first response.",
                    pendingLeadFollowUps,
                    pendingLeadFollowUps > 0 ? "danger" : "info",
                    "Review Leads",
                    "leads"
                )
            };

            var visits = leads
                .Where(item => item.Stage == LeadStage.Visit || !string.IsNullOrWhiteSpace(item.Timeline))
                .OrderByDescending(item => item.LastActivityAt)
                .Take(4)
                .Select(item => new DashboardVisitResponse(
                    item.Id,
                    string.IsNullOrWhiteSpace(item.Property) ? "Property Visit Follow-Up" : item.Property,
                    item.Name,
                    item.LastActivityAt,
                    item.Timeline,
                    MapVisitStatus(item.Stage)
                ))
                .ToList();

            var overview = new DashboardOverviewResponse(
                properties.Count(item => item.Status == PropertyStatus.Open),
                CalculatePercentageChange(currentMonthListings, previousMonthListings),
                weeklyLeads.Count(item => item.Stage == LeadStage.New),
                weeklyLeads.Count(item =>
                    item.Stage == LeadStage.Contacted ||
                    item.Stage == LeadStage.Pending ||
                    item.Stage == LeadStage.Qualified ||
                    item.Stage == LeadStage.Visit ||
                    item.Stage == LeadStage.Negotiation),
                deals.Count(item => item.CreatedAt >= startOfWeek && item.Stage != DealStage.Canceled),
                deals.Count(item => item.Stage != DealStage.Completed && item.Stage != DealStage.Canceled),
                deals.Count(item =>
                    item.Stage == DealStage.Closing ||
                    (item.Stage == DealStage.Completed && item.UpdatedAt >= startOfMonth)),
                currentMonthRevenue,
                CalculatePercentageChange(currentMonthRevenue, previousMonthRevenue)
            );

            return new DashboardSummaryResponse(overview, topAgents, alerts, visits);
        }

        private static int CalculateGrowthScore(decimal revenue, decimal maxRevenue, int activePropertyCount, int maxPropertyCount)
        {
            if (maxRevenue > 0)
            {
                return Math.Clamp((int)Math.Round((revenue / maxRevenue) * 100m), 12, 100);
            }

            if (maxPropertyCount > 0)
            {
                return Math.Clamp((int)Math.Round((activePropertyCount / (decimal)maxPropertyCount) * 100m), 12, 100);
            }

            return 12;
        }

        private static decimal CalculatePercentageChange(decimal current, decimal previous)
        {
            if (previous == 0m)
            {
                return current > 0m ? 100m : 0m;
            }

            return Math.Round(((current - previous) / previous) * 100m, 1);
        }

        private static decimal CalculatePercentageChange(int current, int previous)
            => CalculatePercentageChange((decimal)current, previous);

        private static string MapVisitStatus(LeadStage stage)
        {
            return stage switch
            {
                LeadStage.Deal => "Completed",
                LeadStage.Canceled => "Canceled",
                LeadStage.Visit => "Scheduled",
                _ => "FollowUp"
            };
        }

        private static DateTime StartOfWeek(DateTime value, DayOfWeek startDay)
        {
            var diff = (7 + (value.DayOfWeek - startDay)) % 7;
            return value.Date.AddDays(-diff);
        }
    }
}
