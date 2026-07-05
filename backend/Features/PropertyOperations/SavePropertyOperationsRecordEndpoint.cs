using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class SavePropertyOperationsRecordEndpoint(PropertyOperationsService service)
    : Endpoint<SavePropertyOperationsRecordRequest, PropertyOperationsRecordResponse>
{
    public override void Configure()
    {
        Post("/property-operations/records/save");
        Roles("Admin");
    }

    public override async Task HandleAsync(SavePropertyOperationsRecordRequest req, CancellationToken ct)
    {
        var item = await service.SaveRecordAsync(req.Id, req.PropertyId, req.ModuleKey, req.RecordType, req.Title, req.Description, req.Status, req.Priority, string.Empty, string.Empty, string.Empty, req.Amount, req.DueAt, req.PayloadJson, ct);
        await Send.OkAsync(PropertyOperationsResponseMapper.ToResponse(item, req.PropertyId), ct);
    }
}
