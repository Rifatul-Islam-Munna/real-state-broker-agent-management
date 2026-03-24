using Entities;
using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreateLeadEndpoint : Endpoint<Lead, LeadResponse>
    {
        public required LeadService LeadService { get; set; }

        public override void Configure()
        {
            Post("/leads");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Create a lead");
        }

        public override async Task HandleAsync(Lead req, CancellationToken ct)
        {
            var result = await LeadService.CreateLeadAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateLeadEndpoint : Endpoint<Lead, LeadResponse>
    {
        public required LeadService LeadService { get; set; }

        public override void Configure()
        {
            Patch("/leads");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update a lead");
        }

        public override async Task HandleAsync(Lead req, CancellationToken ct)
        {
            var result = await LeadService.UpdateLeadAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class DeleteLeadEndpoint : Endpoint<DeleteLeadEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required LeadService LeadService { get; set; }

        public override void Configure()
        {
            Delete("/leads");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Delete a lead");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await LeadService.DeleteLeadAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetLeadEndpoint : Endpoint<GetLeadEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public LeadStage? Stage { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public required LeadService LeadService { get; set; }

        public override void Configure()
        {
            Get("/leads");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get lead by id or paginated list of leads");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            if (req.Id.HasValue)
            {
                var result = await LeadService.GetLeadAsync(req.Id.Value);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
                return;
            }

            var resultList = await LeadService.GetAllLeadsAsync(req.Page, req.PageSize, req.Search, req.Stage);
            await Send.OkAsync(resultList, ct);
        }
    }
}
