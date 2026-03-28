using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetMarketingSettingsEndpoint : EndpointWithoutRequest<MarketingSettingsResponse>
    {
        public required MarketingSettingsService MarketingSettingsService { get; set; }

        public override void Configure()
        {
            Get("/marketing-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch editable marketing settings for admin");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await MarketingSettingsService.GetAdminSettingsAsync();
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateMarketingSettingsEndpoint : Endpoint<UpdateMarketingSettingsRequest, MarketingSettingsResponse>
    {
        public required MarketingSettingsService MarketingSettingsService { get; set; }

        public override void Configure()
        {
            Patch("/marketing-settings");
            Roles("Admin");
            Summary(s => s.Summary = "Update editable marketing settings");
        }

        public override async Task HandleAsync(UpdateMarketingSettingsRequest req, CancellationToken ct)
        {
            var result = await MarketingSettingsService.UpdateSettingsAsync(req);
            await Send.OkAsync(result, ct);
        }
    }
}
