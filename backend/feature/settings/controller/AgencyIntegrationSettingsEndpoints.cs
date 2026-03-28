using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetAgencyIntegrationSettingsEndpoint : EndpointWithoutRequest<AgencyIntegrationStatusResponse>
    {
        public required AgencyIntegrationSettingsService AgencyIntegrationSettingsService { get; set; }

        public override void Configure()
        {
            Get("/settings/integrations");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch write-only integration status for admin settings");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await AgencyIntegrationSettingsService.GetStatusAsync();
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateAgencyIntegrationSettingsEndpoint : Endpoint<UpdateAgencyIntegrationSettingsRequest, AgencyIntegrationStatusResponse>
    {
        public required AgencyIntegrationSettingsService AgencyIntegrationSettingsService { get; set; }

        public override void Configure()
        {
            Patch("/settings/integrations");
            Roles("Admin");
            Summary(s => s.Summary = "Write or clear integration settings without reading secret values back");
        }

        public override async Task HandleAsync(UpdateAgencyIntegrationSettingsRequest req, CancellationToken ct)
        {
            try
            {
                var result = await AgencyIntegrationSettingsService.UpdateAsync(req);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
        }
    }
}
