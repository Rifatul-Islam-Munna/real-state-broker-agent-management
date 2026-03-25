using Entities;
using FastEndpoints;
using Services;

namespace Endpoints
{
    public class CreateMailInboxEndpoint : Endpoint<MailInboxItem, MailInboxResponse>
    {
        public required MailInboxService MailInboxService { get; set; }

        public override void Configure()
        {
            Post("/mail-inbox");
            AllowAnonymous();
            Summary(s => s.Summary = "Create a mail inbox item from direct mail or newsletter signup");
        }

        public override async Task HandleAsync(MailInboxItem req, CancellationToken ct)
        {
            var result = await MailInboxService.CreateMailInboxItemAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateMailInboxEndpoint : Endpoint<MailInboxItem, MailInboxResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required MailInboxService MailInboxService { get; set; }

        public override void Configure()
        {
            Patch("/mail-inbox");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update a mail inbox item");
        }

        public override async Task HandleAsync(MailInboxItem req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            var result = await MailInboxService.UpdateMailInboxItemAsync(req);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }

    public class DeleteMailInboxEndpoint : Endpoint<DeleteMailInboxEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required MailInboxService MailInboxService { get; set; }

        public override void Configure()
        {
            Delete("/mail-inbox");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Delete a mail inbox item");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            await MailInboxService.DeleteMailInboxItemAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetMailInboxEndpoint : Endpoint<GetMailInboxEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public MailInboxStatus? Status { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public required MailInboxService MailInboxService { get; set; }

        public override void Configure()
        {
            Get("/mail-inbox");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get a mail inbox item by id or a paginated inbox list");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            if (req.Id.HasValue)
            {
                var result = await MailInboxService.GetMailInboxItemAsync(req.Id.Value);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
                return;
            }

            var resultList = await MailInboxService.GetAllMailInboxItemsAsync(req.Page, req.PageSize, req.Search, req.Status);
            await Send.OkAsync(resultList, ct);
        }
    }

    public class ConvertMailInboxToLeadEndpoint : Endpoint<ConvertMailInboxInput, LeadResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required MailInboxService MailInboxService { get; set; }

        public override void Configure()
        {
            Post("/mail-inbox/convert-to-lead");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Convert a mail inbox item into a lead");
        }

        public override async Task HandleAsync(ConvertMailInboxInput req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            var result = await MailInboxService.ConvertToLeadAsync(req.MailInboxId);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }
}
