using FastEndpoints;
using Services;
using Entities;
using Models;

namespace Endpoints
{
    // ✅ CREATE
    public class CreatePropertyEndpoint : Endpoint<Property, Property>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Post("/properties");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Create a new property";
                s.Description = "Pass full property object in body. Slug is auto-generated from title.";
            });
        }

        public override async Task HandleAsync(Property req, CancellationToken ct)
        {
            var result = await PropertyService.CreatePropertyAsync(req);
            await Send.OkAsync(result);
        }
    }

    // ✅ UPDATE
    public class UpdatePropertyEndpoint : Endpoint<Property, Property>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Put("/properties");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Update an existing property";
                s.Description = "Pass full property object with Id in body.";
            });
        }

        public override async Task HandleAsync(Property req, CancellationToken ct)
        {
            var existing = await PropertyService.GetPropertyAsync(req.Id);
            if (existing is null) { await Send.NotFoundAsync(); return; }

            var result = await PropertyService.UpdatePropertyAsync(req);
            await Send.OkAsync(result);
        }
    }

    // ✅ DELETE
    public class DeletePropertyEndpoint : Endpoint<DeletePropertyEndpoint.Request>
    {
        public class Request { [QueryParam] public int Id { get; set; } }

        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Delete("/properties");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Delete a property";
                s.Description = "Pass ?id=1 as query param.";
            });
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await PropertyService.DeletePropertyAsync(req.Id);
            await Send.NoContentAsync();
        }
    }

    // ✅ SMART GET — handles all 3 cases in one endpoint
    public class GetPropertyEndpoint : Endpoint<GetPropertyEndpoint.Request>
    {
        public class Request
        {
            [QueryParam] public int? Id { get; set; }           // ?id=1
            [QueryParam] public string? Slug { get; set; }      // ?slug=my-property
            [QueryParam] public int Page { get; set; } = 1;     // ?page=1
            [QueryParam] public int PageSize { get; set; } = 10; // ?pageSize=10
        }

        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Get("/properties");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Smart GET — fetch by id, slug, or paginated list";
                s.Description = """
                    Pass one of the following:
                    - ?id=1           → returns single property by ID
                    - ?slug=my-prop   → returns single property by slug
                    - ?page=1&pageSize=10 → returns paginated list (default)
                """;
            });
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            // 👇 id takes priority
            if (req.Id.HasValue)
            {
                var property = await PropertyService.GetPropertyAsync(req.Id.Value);
                if (property is null) { await Send.NotFoundAsync(); return; }
                await Send.OkAsync(property);
                return;
            }

            // 👇 then slug
            if (!string.IsNullOrWhiteSpace(req.Slug))
            {
                var property = await PropertyService.GetPropertyBySlugAsync(req.Slug);
                if (property is null) { await Send.NotFoundAsync(); return; }
                await Send.OkAsync(property);
                return;
            }

            // 👇 fallback — paginated list
            var result = await PropertyService.GetAllPropertiesAsync(req.Page, req.PageSize);
            await Send.OkAsync(result);
        }
    }
}
