using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetDashboardSummaryEndpoint : EndpointWithoutRequest<DashboardSummaryResponse>
    {
        public required DashboardService DashboardService { get; set; }

        public override void Configure()
        {
            Get("/dashboard/summary");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get dashboard summary metrics for the admin and agent portals");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var summary = await DashboardService.GetSummaryAsync();
            await Send.OkAsync(summary, ct);
        }
    }
}
