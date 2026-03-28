using Entities;
using FastEndpoints;
using Services;

namespace Endpoints
{
    public class CreateLeadHistoryEndpoint : Endpoint<CreateLeadHistoryEntryInput, LeadHistoryEntryResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadHistoryService LeadHistoryService { get; set; }

        public override void Configure()
        {
            Post("/lead-history");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create a lead history entry");
        }

        public override async Task HandleAsync(CreateLeadHistoryEntryInput req, CancellationToken ct)
        {
            try
            {
                await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
                var result = await LeadHistoryService.CreateAsync(req, ct);
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

    public class GetLeadHistoryEndpoint : Endpoint<GetLeadHistoryEndpoint.Request, List<LeadHistoryEntryResponse>>
    {
        public class Request
        {
            [QueryParam]
            public int LeadId { get; set; }
        }

        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadHistoryService LeadHistoryService { get; set; }

        public override void Configure()
        {
            Get("/lead-history");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Fetch the history timeline for a lead");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await LeadHistoryService.GetForLeadAsync(req.LeadId, ct);
            await Send.OkAsync(result, ct);
        }
    }
}
