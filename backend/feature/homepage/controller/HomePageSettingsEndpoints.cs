using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetAdminHomePageSettingsEndpoint : EndpointWithoutRequest<HomePageSettingsResponse>
    {
        public required HomePageSettingsService HomePageSettingsService { get; set; }

        public override void Configure()
        {
            Get("/homepage-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch the editable homepage settings for admin");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await HomePageSettingsService.GetAdminSettingsAsync();
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateHomePageSettingsEndpoint : Endpoint<UpdateHomePageSettingsRequest, HomePageSettingsResponse>
    {
        public required HomePageSettingsService HomePageSettingsService { get; set; }

        public override void Configure()
        {
            Patch("/homepage-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Update the editable homepage settings");
        }

        public override async Task HandleAsync(UpdateHomePageSettingsRequest req, CancellationToken ct)
        {
            var result = await HomePageSettingsService.UpdateSettingsAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class GetPublicHomePageSettingsEndpoint : EndpointWithoutRequest<HomePageSettingsResponse>
    {
        public required HomePageSettingsService HomePageSettingsService { get; set; }

        public override void Configure()
        {
            Get("/public/homepage-settings");
            AllowAnonymous();
            Summary(s => s.Summary = "Fetch the public homepage settings");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await HomePageSettingsService.GetPublicSettingsAsync();
            await Send.OkAsync(result, ct);
        }
    }
}
