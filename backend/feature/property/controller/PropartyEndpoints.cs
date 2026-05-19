using Entities;
using FastEndpoints;
using Models;
using Services;
using System.Security.Claims;

namespace Endpoints
{
    public class CreatePropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
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
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Properties, ct);
            if (!await ValidateOwnerFields(req, ct))
            {
                return;
            }
            var result = await PropertyService.CreatePropertyAsync(req, GetActor(HttpContext.User), HttpContext.User.IsInRole("Admin"));
            await Send.OkAsync(result, ct);
        }

        private static string GetActor(ClaimsPrincipal user)
            => user.FindFirst("fullName")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value ?? "CRM";

        private async Task<bool> ValidateOwnerFields(Property req, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(req.OwnerName) &&
                !string.IsNullOrWhiteSpace(req.OwnerEmail) &&
                !string.IsNullOrWhiteSpace(req.OwnerPhone))
            {
                return true;
            }

            AddError(r => r.OwnerName, "Owner name is required.");
            AddError(r => r.OwnerEmail, "Owner email is required.");
            AddError(r => r.OwnerPhone, "Owner phone is required.");
            await Send.ErrorsAsync(cancellation: ct);
            return false;
        }
    }

    public class UpdatePropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
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
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Properties, ct);
            if (!await ValidateOwnerFields(req, ct))
            {
                return;
            }
            var result = await PropertyService.UpdatePropertyAsync(req, GetActor(HttpContext.User), HttpContext.User.IsInRole("Admin"));

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }

        private static string GetActor(ClaimsPrincipal user)
            => user.FindFirst("fullName")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value ?? "CRM";

        private async Task<bool> ValidateOwnerFields(Property req, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(req.OwnerName) &&
                !string.IsNullOrWhiteSpace(req.OwnerEmail) &&
                !string.IsNullOrWhiteSpace(req.OwnerPhone))
            {
                return true;
            }

            AddError(r => r.OwnerName, "Owner name is required.");
            AddError(r => r.OwnerEmail, "Owner email is required.");
            AddError(r => r.OwnerPhone, "Owner phone is required.");
            await Send.ErrorsAsync(cancellation: ct);
            return false;
        }
    }

    public class PatchPropertyEndpoint : Endpoint<Property, PropertyResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
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
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Properties, ct);
            if (!await ValidateOwnerFields(req, ct))
            {
                return;
            }
            var result = await PropertyService.UpdatePropertyAsync(req, GetActor(HttpContext.User), HttpContext.User.IsInRole("Admin"));

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }

        private static string GetActor(ClaimsPrincipal user)
            => user.FindFirst("fullName")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value ?? "CRM";

        private async Task<bool> ValidateOwnerFields(Property req, CancellationToken ct)
        {
            if (!string.IsNullOrWhiteSpace(req.OwnerName) &&
                !string.IsNullOrWhiteSpace(req.OwnerEmail) &&
                !string.IsNullOrWhiteSpace(req.OwnerPhone))
            {
                return true;
            }

            AddError(r => r.OwnerName, "Owner name is required.");
            AddError(r => r.OwnerEmail, "Owner email is required.");
            AddError(r => r.OwnerPhone, "Owner phone is required.");
            await Send.ErrorsAsync(cancellation: ct);
            return false;
        }
    }

    public class DeletePropertyEndpoint : Endpoint<DeletePropertyEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
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
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Properties, ct);
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
            var canSeePrivateFields = CanSeePrivateFields(HttpContext.User);

            if (req.Id.HasValue)
            {
                var property = await PropertyService.GetPropertyAsync(req.Id.Value);

                if (property is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(canSeePrivateFields ? property : RedactPrivateFields(property), ct);
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

                await Send.OkAsync(canSeePrivateFields ? property : RedactPrivateFields(property), ct);
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

            await Send.OkAsync(canSeePrivateFields ? result : RedactPrivateFields(result), ct);
        }

        private static bool CanSeePrivateFields(ClaimsPrincipal user)
        {
            return user.IsInRole("Admin") || user.IsInRole("Agent");
        }

        private static PropertyResponse RedactPrivateFields(PropertyResponse property)
        {
            return property with
            {
                OwnerName = string.Empty,
                OwnerEmail = string.Empty,
                OwnerPhone = string.Empty,
                OwnerCompany = null,
                OwnerAddress = null,
                OwnerNotes = null,
                SellPrediction = new PropertySellPredictionResponse(
                    0,
                    false,
                    0,
                    0,
                    0,
                    "Visible to admin and agent accounts only."
                )
            };
        }

        private static PaginatedResult<PropertyResponse> RedactPrivateFields(PaginatedResult<PropertyResponse> result)
        {
            return new PaginatedResult<PropertyResponse>
            {
                Items = result.Items.Select(RedactPrivateFields).ToList(),
                TotalCount = result.TotalCount,
                Page = result.Page,
                PageSize = result.PageSize,
                TotalPages = result.TotalPages,
            };
        }
    }

    public class GetPropertyFiltersEndpoint : EndpointWithoutRequest<PublicPropertyFiltersResponse>
    {
        public required PropertyService PropertyService { get; set; }

        public override void Configure()
        {
            Get("/properties/filters");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Fetch public property filter options";
                s.Description = "Returns public property categories, listing types, and top locations for the search UI.";
            });
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await PropertyService.GetPublicPropertyFiltersAsync();
            await Send.OkAsync(result, ct);
        }
    }
}
