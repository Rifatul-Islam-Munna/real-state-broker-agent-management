using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetAgencyCommunicationTemplatesForOutreachEndpoint : EndpointWithoutRequest<List<AgencyCommunicationTemplateItem>>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Get("/lead-outreach/templates");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Fetch lead outreach communication templates");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await AgencySettingsService.GetCommunicationTemplatesAsync(ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class SaveAgencyCommunicationTemplateEndpoint : Endpoint<AgencyCommunicationTemplateItem, AgencyCommunicationTemplateItem>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Post("/lead-outreach/templates");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create or update reusable lead outreach template");
        }

        public override async Task HandleAsync(AgencyCommunicationTemplateItem req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await AgencySettingsService.SaveCommunicationTemplateAsync(req, ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class DeleteAgencyCommunicationTemplateEndpoint : Endpoint<DeleteAgencyCommunicationTemplateEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public string Id { get; set; } = string.Empty;
        }

        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Delete("/lead-outreach/templates");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Delete reusable lead outreach template");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var deleted = await AgencySettingsService.DeleteCommunicationTemplateAsync(req.Id, ct);

            if (!deleted)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.NoContentAsync(ct);
        }
    }
}
