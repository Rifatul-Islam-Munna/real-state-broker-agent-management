using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class GetPropertyOperationsRecordsEndpoint(PropertyOperationsService service)
    : Endpoint<GetPropertyOperationsRecordsEndpoint.Request, List<PropertyOperationsRecordResponse>>
{
    public sealed class Request
    {
        [QueryParam]
        public int PropertyId { get; set; }

        [QueryParam]
        public string? ModuleKey { get; set; }
    }

    public override void Configure()
    {
        Get("/property-operations/records");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var records = await service.GetRecordsAsync(req.PropertyId, req.ModuleKey, ct);
        await Send.OkAsync(records.Select(item => PropertyOperationsResponseMapper.ToResponse(item, req.PropertyId)).ToList(), ct);
    }
}
