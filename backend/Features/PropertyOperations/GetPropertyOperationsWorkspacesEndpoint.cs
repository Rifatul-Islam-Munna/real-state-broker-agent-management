using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class GetPropertyOperationsWorkspacesEndpoint(PropertyOperationsService service)
    : EndpointWithoutRequest<List<PropertyOperationsWorkspaceResponse>>
{
    public override void Configure()
    {
        Get("/property-operations/workspaces");
        Roles("Admin");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var workspaces = await service.GetWorkspacesAsync(ct);
        await Send.OkAsync(workspaces.Select(PropertyOperationsResponseMapper.ToResponse).ToList(), ct);
    }
}
