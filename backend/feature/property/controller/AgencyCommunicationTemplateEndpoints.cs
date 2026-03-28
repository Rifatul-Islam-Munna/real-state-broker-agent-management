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
            var result = (await AgencySettingsService.GetAdminSettingsAsync()).CommunicationTemplates;
            await Send.OkAsync(result, ct);
        }
    }
}
