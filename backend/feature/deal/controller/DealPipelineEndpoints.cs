using Entities;
using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreateDealPipelineEndpoint : Endpoint<DealPipeline, DealPipelineResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required DealPipelineService DealPipelineService { get; set; }

        public override void Configure()
        {
            Post("/deals");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create a deal pipeline item");
        }

        public override async Task HandleAsync(DealPipeline req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.DealPipeline, ct);
            var result = await DealPipelineService.CreateDealAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateDealPipelineEndpoint : Endpoint<DealPipeline, DealPipelineResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required DealPipelineService DealPipelineService { get; set; }

        public override void Configure()
        {
            Patch("/deals");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update a deal pipeline item");
        }

        public override async Task HandleAsync(DealPipeline req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.DealPipeline, ct);
            var result = await DealPipelineService.UpdateDealAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class DeleteDealPipelineEndpoint : Endpoint<DeleteDealPipelineEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required DealPipelineService DealPipelineService { get; set; }

        public override void Configure()
        {
            Delete("/deals");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Delete a deal pipeline item");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.DealPipeline, ct);
            await DealPipelineService.DeleteDealAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetDealPipelineEndpoint : Endpoint<GetDealPipelineEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public DealStage? Stage { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public required DealPipelineService DealPipelineService { get; set; }

        public override void Configure()
        {
            Get("/deals");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get a deal pipeline item by id or a paginated deal list");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.DealPipeline, ct);
            if (req.Id.HasValue)
            {
                var result = await DealPipelineService.GetDealAsync(req.Id.Value);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
                return;
            }

            var resultList = await DealPipelineService.GetAllDealsAsync(req.Page, req.PageSize, req.Search, req.Stage);
            await Send.OkAsync(resultList, ct);
        }
    }

    public class ConvertLeadToDealEndpoint : Endpoint<ConvertLeadToDealInput, DealPipelineResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required DealPipelineService DealPipelineService { get; set; }

        public override void Configure()
        {
            Post("/deals/convert-from-lead");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create or return a deal pipeline item from a lead");
        }

        public override async Task HandleAsync(ConvertLeadToDealInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.DealPipeline, ct);
            var result = await DealPipelineService.ConvertLeadToDealAsync(req.LeadId);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }
}
