using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class GetPropertyOperationsSettingsEndpoint(PropertyOperationsPublicService service)
    : EndpointWithoutRequest<PropertyOperationsSettingsResponse>
{
    public override void Configure()
    {
        Get("/property-operations/settings");
        Roles("Admin");
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(PropertyOperationsPublicService.Map(await service.GetSettingsAsync(ct)), ct);
}

public sealed class UpdatePropertyOperationsSettingsEndpoint(PropertyOperationsPublicService service)
    : Endpoint<UpdatePropertyOperationsSettingsRequest, PropertyOperationsSettingsResponse>
{
    public override void Configure()
    {
        Patch("/property-operations/settings");
        Roles("Admin");
    }

    public override async Task HandleAsync(UpdatePropertyOperationsSettingsRequest req, CancellationToken ct) =>
        await Send.OkAsync(PropertyOperationsPublicService.Map(await service.UpdateSettingsAsync(req, ct)), ct);
}

public sealed class CreatePropertyOperationsPublicAccessEndpoint(PropertyOperationsPublicService service)
    : Endpoint<CreatePropertyOperationsPublicAccessRequest, PropertyOperationsPublicAccessResponse>
{
    public override void Configure()
    {
        Post("/property-operations/public-access");
        Roles("Admin");
    }

    public override async Task HandleAsync(CreatePropertyOperationsPublicAccessRequest req, CancellationToken ct)
    {
        var result = await service.CreateAccessAsync(req, ct);
        var links = await service.GetAccessLinksAsync(req.PropertyId, ct);
        var hydrated = links.First(item => item.Id == result.Item.Id);
        await Send.OkAsync(PropertyOperationsPublicService.Map(hydrated, result.Token, result.Url), ct);
    }
}

public sealed class GetPropertyOperationsPublicAccessEndpoint(PropertyOperationsPublicService service)
    : Endpoint<GetPropertyOperationsPublicAccessEndpoint.Request, List<PropertyOperationsPublicAccessResponse>>
{
    public sealed class Request
    {
        [QueryParam]
        public int? PropertyId { get; set; }
    }

    public override void Configure()
    {
        Get("/property-operations/public-access");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var items = await service.GetAccessLinksAsync(req.PropertyId, ct);
        await Send.OkAsync(items.Select(item => PropertyOperationsPublicService.Map(item)).ToList(), ct);
    }
}

public sealed class RevokePropertyOperationsPublicAccessEndpoint(PropertyOperationsPublicService service)
    : Endpoint<RevokePropertyOperationsPublicAccessEndpoint.Request>
{
    public sealed class Request
    {
        [QueryParam]
        public int Id { get; set; }
    }

    public override void Configure()
    {
        Patch("/property-operations/public-access/revoke");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        await service.RevokeAsync(req.Id, ct);
        await Send.NoContentAsync(ct);
    }
}

public sealed class GetPropertyOperationsSubmissionsEndpoint(PropertyOperationsPublicService service)
    : Endpoint<GetPropertyOperationsSubmissionsEndpoint.Request, List<PropertyOperationsPublicSubmissionResponse>>
{
    public sealed class Request
    {
        [QueryParam]
        public int AccessId { get; set; }
    }

    public override void Configure()
    {
        Get("/property-operations/public-submissions");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var items = await service.GetSubmissionsAsync(req.AccessId, ct);
        await Send.OkAsync(items.Select(item => new PropertyOperationsPublicSubmissionResponse
        {
            Id = item.Id,
            ResponderName = item.ResponderName,
            ResponderEmail = item.ResponderEmail,
            ResponderPhone = item.ResponderPhone,
            Notes = item.Notes,
            ResponseJson = item.ResponseJson,
            AttachmentUrlsJson = item.AttachmentUrlsJson,
            SubmittedAt = item.SubmittedAt,
        }).ToList(), ct);
    }
}

public sealed class GetPropertyOperationsAnalyticsEndpoint(PropertyOperationsPublicService service)
    : EndpointWithoutRequest<PropertyOperationsAnalyticsResponse>
{
    public override void Configure()
    {
        Get("/property-operations/analytics");
        Roles("Admin");
    }

    public override async Task HandleAsync(CancellationToken ct) =>
        await Send.OkAsync(await service.GetAnalyticsAsync(ct), ct);
}

public sealed class GetPropertyOperationsActivityEndpoint(PropertyOperationsPublicService service)
    : Endpoint<GetPropertyOperationsActivityEndpoint.Request, List<PropertyOperationsActivityResponse>>
{
    public sealed class Request
    {
        [QueryParam]
        public int? PropertyId { get; set; }
    }

    public override void Configure()
    {
        Get("/property-operations/activity");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct) =>
        await Send.OkAsync(await service.GetActivitiesAsync(req.PropertyId, ct), ct);
}

public sealed class DeletePropertyOperationsRecordEndpoint(PropertyOperationsService service)
    : Endpoint<DeletePropertyOperationsRecordEndpoint.Request>
{
    public sealed class Request
    {
        [QueryParam]
        public int Id { get; set; }
    }

    public override void Configure()
    {
        Delete("/property-operations/records");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        await service.DeleteRecordAsync(req.Id, ct);
        await Send.NoContentAsync(ct);
    }
}

public sealed class DeletePropertyOperationsWorkspaceEndpoint(PropertyOperationsService service)
    : Endpoint<DeletePropertyOperationsWorkspaceEndpoint.Request>
{
    public sealed class Request
    {
        [QueryParam]
        public int PropertyId { get; set; }
    }

    public override void Configure()
    {
        Delete("/property-operations/workspaces");
        Roles("Admin");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        await service.RemoveWorkspaceAsync(req.PropertyId, ct);
        await Send.NoContentAsync(ct);
    }
}
