using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class UpdatePropertyOperationsModuleStateEndpoint(PropertyOperationsService service)
    : Endpoint<UpdatePropertyOperationsModuleStateRequest, PropertyOperationsModuleStateResponse>
{
    public override void Configure()
    {
        Patch("/property-operations/module-state");
        Roles("Admin");
    }

    public override async Task HandleAsync(UpdatePropertyOperationsModuleStateRequest req, CancellationToken ct)
    {
        var state = await service.UpdateModuleStateAsync(req.PropertyId, req.ModuleKey, req.Status, req.Notes, ct);
        await Send.OkAsync(new PropertyOperationsModuleStateResponse
        {
            Id = state.Id,
            ModuleKey = state.ModuleKey,
            Status = state.Status,
            Notes = state.Notes,
            UpdatedAt = state.UpdatedAt,
        }, ct);
    }
}
