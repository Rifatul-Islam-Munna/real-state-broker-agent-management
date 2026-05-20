using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetPropertyFeedbackSettingsEndpoint : EndpointWithoutRequest<PropertyFeedbackAutomationSettingsResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Get("/property-feedback/settings");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get property feedback automation settings");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.GetSettingsAsync(ct), ct);
        }
    }

    public class UpdatePropertyFeedbackSettingsEndpoint : Endpoint<UpdatePropertyFeedbackAutomationSettingsRequest, PropertyFeedbackAutomationSettingsResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Patch("/property-feedback/settings");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update property feedback automation settings");
        }

        public override async Task HandleAsync(UpdatePropertyFeedbackAutomationSettingsRequest req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.UpdateSettingsAsync(req, ct), ct);
        }
    }

    public class GetPropertyFeedbackRequestsEndpoint : EndpointWithoutRequest<List<ShowingFeedbackRequestResponse>>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Get("/property-feedback/requests");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get showing feedback requests");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.GetFeedbackRequestsAsync(ct), ct);
        }
    }

    public class CreatePropertyFeedbackRequestEndpoint : Endpoint<CreateShowingFeedbackRequestInput, ShowingFeedbackRequestResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Post("/property-feedback/requests");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create a showing feedback request");
        }

        public override async Task HandleAsync(CreateShowingFeedbackRequestInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.CreateFeedbackRequestAsync(req, ct), ct);
        }
    }

    public class GetPropertyFeedbackEntriesEndpoint : Endpoint<GetPropertyFeedbackEntriesEndpoint.Request, List<PropertyVisitFeedbackResponse>>
    {
        public class Request
        {
            [QueryParam]
            public int? PropertyId { get; set; }
        }

        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Get("/property-feedback/entries");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get property visit feedback entries");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.GetFeedbackEntriesAsync(req.PropertyId, ct), ct);
        }
    }

    public class SavePropertyFeedbackEntryEndpoint : Endpoint<SavePropertyVisitFeedbackInput, PropertyVisitFeedbackResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Post("/property-feedback/entries");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Save manual property visit feedback");
        }

        public override async Task HandleAsync(SavePropertyVisitFeedbackInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.SaveFeedbackAsync(req, ct), ct);
        }
    }

    public class ImportPropertyFeedbackEntriesEndpoint : Endpoint<PropertyFeedbackImportInput, PropertyFeedbackImportResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Post("/property-feedback/import-feedback");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Import property feedback rows with custom mapping");
        }

        public override async Task HandleAsync(PropertyFeedbackImportInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.ImportFeedbackAsync(req, ct), ct);
        }
    }

    public class ImportPropertyShowingsEndpoint : Endpoint<PropertyShowingImportInput, PropertyFeedbackImportResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Post("/property-feedback/import-showings");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Import showing rows with custom mapping");
        }

        public override async Task HandleAsync(PropertyShowingImportInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.ImportShowingsAsync(req, ct), ct);
        }
    }

    public class GetPropertyOwnerReportsEndpoint : EndpointWithoutRequest<PropertyOwnerReportWorkspaceResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Get("/property-feedback/owner-reports");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get owner report summaries and dispatch history");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.GetOwnerReportWorkspaceAsync(ct), ct);
        }
    }

    public class SendPropertyOwnerReportsEndpoint : Endpoint<SendPropertyOwnerReportsInput, PropertyFeedbackImportResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyFeedbackService PropertyFeedbackService { get; set; }

        public override void Configure()
        {
            Post("/property-feedback/owner-reports/send");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Send owner reports now");
        }

        public override async Task HandleAsync(SendPropertyOwnerReportsInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await PropertyFeedbackService.SendOwnerReportsNowAsync(req, ct), ct);
        }
    }
}
