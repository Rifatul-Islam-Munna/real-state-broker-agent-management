using FastEndpoints;

namespace Endpoints
{
    public sealed class PropertyOperationsHealthEndpoint : EndpointWithoutRequest
    {
        public override void Configure()
        {
            Get("/property-operations/health");
            AllowAnonymous();
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await Send.OkAsync(ct);
        }
    }
}
