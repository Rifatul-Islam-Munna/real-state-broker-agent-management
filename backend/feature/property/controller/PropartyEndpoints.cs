using Entities;
using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreatePropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Post("/properties");
            Roles("Admin", "Agent");
            Summary(s =>
            {
                s.Summary = "Create a new property";
                s.Description = "Pass the property payload in the request body.";
            });
        }

        public override async Task HandleAsync(Property req, CancellationToken ct)
        {
            var result = await PropertyService.CreatePropertyAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdatePropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Put("/properties");
            Roles("Admin", "Agent");
            Summary(s =>
            {
                s.Summary = "Update an existing property";
                s.Description = "Pass the full property object with Id in the request body.";
            });
        }

        public override async Task HandleAsync(Property req, CancellationToken ct)
        {
            var result = await PropertyService.UpdatePropertyAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class PatchPropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Patch("/properties");
            Roles("Admin", "Agent");
            Summary(s =>
            {
                s.Summary = "Patch an existing property";
                s.Description = "Pass the full property object with Id in the request body.";
            });
        }

        public override async Task HandleAsync(Property req, CancellationToken ct)
        {
            var result = await PropertyService.UpdatePropertyAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class DeletePropertyEndpoint : Endpoint<DeletePropertyEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Delete("/properties");
            Roles("Admin", "Agent");
            Summary(s =>
            {
                s.Summary = "Delete a property";
                s.Description = "Pass ?id=1 as a query param.";
            });
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await PropertyService.DeletePropertyAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetPropertyEndpoint : Endpoint<GetPropertyEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Slug { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public PropertyCategory? PropertyType { get; set; }

            [QueryParam]
            public PropertyListingType? ListingType { get; set; }

            [QueryParam]
            public PropertyStatus? Status { get; set; }

            [QueryParam]
            public string? Agent { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 10;
        }

        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Get("/properties");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Fetch a property by id, slug, or paginated list";
                s.Description = """
                    Pass one of the following:
                    - ?id=1
                    - ?slug=my-property
                    - ?page=1&pageSize=10
                    Optional filters: search, propertyType, listingType, status, agent
                """;
            });
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            if (req.Id.HasValue)
            {
                var property = await PropertyService.GetPropertyAsync(req.Id.Value);

                if (property is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(property, ct);
                return;
            }

            if (!string.IsNullOrWhiteSpace(req.Slug))
            {
                var property = await PropertyService.GetPropertyBySlugAsync(req.Slug);

                if (property is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(property, ct);
                return;
            }

            var result = await PropertyService.GetAllPropertiesAsync(
                req.Page,
                req.PageSize,
                req.Search,
                req.PropertyType,
                req.ListingType,
                req.Status,
                req.Agent);

            await Send.OkAsync(result, ct);
        }
    }
}
