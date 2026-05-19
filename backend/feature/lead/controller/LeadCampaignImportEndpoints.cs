using FastEndpoints;
using Services;

namespace Endpoints
{
    public class CreateLeadCampaignImportEndpoint : Endpoint<LeadCampaignImportRequest, LeadCampaignImportBatchResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadCampaignImportService LeadCampaignImportService { get; set; }

        public override void Configure()
        {
            Post("/lead-campaign-imports");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Import CSV lead rows, map fields, render templates, and send or schedule outreach");
        }

        public override async Task HandleAsync(LeadCampaignImportRequest req, CancellationToken ct)
        {
            try
            {
                await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
                req.CreatedBy = string.IsNullOrWhiteSpace(req.CreatedBy)
                    ? HttpContext.User.Identity?.Name ?? "CRM"
                    : req.CreatedBy;
                var result = await LeadCampaignImportService.ImportAsync(req, ct);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
            catch (InvalidOperationException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(404, ct);
            }
        }
    }

    public class GetLeadCampaignImportsEndpoint : Endpoint<GetLeadCampaignImportsEndpoint.Request, List<LeadCampaignImportBatchResponse>>
    {
        public class Request
        {
            [QueryParam]
            public int Take { get; set; } = 10;
        }

        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadCampaignImportService LeadCampaignImportService { get; set; }

        public override void Configure()
        {
            Get("/lead-campaign-imports");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Fetch recent CSV lead campaign imports");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await LeadCampaignImportService.GetRecentAsync(req.Take, ct);
            await Send.OkAsync(result, ct);
        }
    }
}
