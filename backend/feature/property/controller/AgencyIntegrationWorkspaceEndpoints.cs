using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetAgencyIntegrationWorkspaceEndpoint : EndpointWithoutRequest<AgencyIntegrationWorkspaceStatusResponse>
    {
        public required AgencyIntegrationWorkspaceService AgencyIntegrationWorkspaceService { get; set; }

        public override void Configure()
        {
            Get("/settings/integrations/workspace");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch write-only integration workspace status for admin settings");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await AgencyIntegrationWorkspaceService.GetStatusAsync(ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateAgencyIntegrationWorkspaceEndpoint : Endpoint<UpdateAgencyIntegrationWorkspaceRequest, AgencyIntegrationWorkspaceStatusResponse>
    {
        public required AgencyIntegrationWorkspaceService AgencyIntegrationWorkspaceService { get; set; }

        public override void Configure()
        {
            Patch("/settings/integrations/workspace");
            Roles("Admin");
            Summary(s => s.Summary = "Validate and save integration settings without returning secrets");
        }

        public override async Task HandleAsync(UpdateAgencyIntegrationWorkspaceRequest req, CancellationToken ct)
        {
            try
            {
                var result = await AgencyIntegrationWorkspaceService.UpdateAsync(req, ct);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
            catch (Exception ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
        }
    }
}
