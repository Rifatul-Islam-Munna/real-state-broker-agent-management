using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class ImportPropertyOperationsEndpoint(PropertyOperationsService service)
    : Endpoint<ImportPropertyOperationsRequest, List<PropertyOperationsWorkspaceResponse>>
{
    public override void Configure()
    {
        Post("/property-operations/import");
        Roles("Admin");
    }

    public override async Task HandleAsync(ImportPropertyOperationsRequest req, CancellationToken ct)
    {
        var workspaces = await service.ImportPropertiesAsync(req.PropertyIds, ct);
        await Send.OkAsync(workspaces.Select(PropertyOperationsResponseMapper.ToResponse).ToList(), ct);
    }
}
