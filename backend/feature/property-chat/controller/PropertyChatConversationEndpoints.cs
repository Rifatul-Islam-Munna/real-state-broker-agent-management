using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreatePropertyChatConversationEndpoint : Endpoint<CreatePropertyChatConversationInput, PropertyChatConversationResponse>
    {
        public required PropertyChatConversationService PropertyChatConversationService { get; set; }

        public override void Configure()
        {
            Post("/property-chats");
            AllowAnonymous();
            Summary(s =>
            {
                s.Summary = "Create a property chat conversation from the public listing chat";
                s.Description = "Stores the questionnaire transcript, generates a summary, and auto-creates a lead when the intake is qualified.";
            });
        }

        public override async Task HandleAsync(CreatePropertyChatConversationInput req, CancellationToken ct)
        {
            var result = await PropertyChatConversationService.CreateConversationAsync(req);
            await Send.OkAsync(result, ct);
        }
    }

    public class GetPropertyChatConversationEndpoint : Endpoint<GetPropertyChatConversationEndpoint.Request>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required PropertyChatConversationService PropertyChatConversationService { get; set; }

        public class Request
        {
            [QueryParam]
            public int? Id { get; set; }

            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public int? PropertyId { get; set; }

            [QueryParam]
            public int? LeadId { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public override void Configure()
        {
            Get("/property-chats");
            Roles("Admin", "Agent");
            Summary(s =>
            {
                s.Summary = "Get a property chat conversation by id or a paginated list";
                s.Description = "Agent and admin inbox view for questionnaire-first property chats.";
            });
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);

            if (req.Id.HasValue)
            {
                var result = await PropertyChatConversationService.GetConversationAsync(req.Id.Value);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
                return;
            }

            var resultList = await PropertyChatConversationService.GetConversationsAsync(
                req.Page,
                req.PageSize,
                req.Search,
                req.PropertyId,
                req.LeadId);

            await Send.OkAsync(resultList, ct);
        }
    }
}
