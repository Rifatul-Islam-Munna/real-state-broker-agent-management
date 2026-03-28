using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetAgencySettingsEndpoint : EndpointWithoutRequest<AgencySettingsResponse>
    {
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Get("/agency-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch editable agency settings for admin");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await AgencySettingsService.GetAdminSettingsAsync();
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateAgencySettingsEndpoint : Endpoint<UpdateAgencySettingsRequest, AgencySettingsResponse>
    {
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Patch("/agency-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Update editable agency settings");
        }

        public override async Task HandleAsync(UpdateAgencySettingsRequest req, CancellationToken ct)
        {
            var result = await AgencySettingsService.UpdateSettingsAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class GetPublicAgencySettingsEndpoint : EndpointWithoutRequest<PublicAgencySettingsResponse>
    {
        public required AgencySettingsService AgencySettingsService { get; set; }

        public override void Configure()
        {
            Get("/public/agency-settings");
            AllowAnonymous();
            Summary(s => s.Summary = "Fetch public agency branding and contact settings");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await AgencySettingsService.GetPublicSettingsAsync();
            await Send.OkAsync(result, ct);
        }
    }
}
