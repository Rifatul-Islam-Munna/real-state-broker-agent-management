using Entities;
using FastEndpoints;
using Models;
using Services;
using System.Security.Claims;

namespace Endpoints
{
    public class GetWebsiteInquiriesEndpoint : Endpoint<GetWebsiteInquiriesEndpoint.Request, PaginatedResult<WebsiteInquiryResponse>>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required WebsiteInquiryService WebsiteInquiryService { get; set; }

        public class Request
        {
            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public override void Configure()
        {
            Get("/website-inquiries");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Unified website inquiry inbox");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            await Send.OkAsync(await WebsiteInquiryService.GetAsync(req.Page, req.PageSize, req.Search, ct), ct);
        }
    }

    public class CreateShowingBookingEndpoint : Endpoint<CreateShowingBookingRequest, ShowingBookingResponse>
    {
        public required ShowingBookingService ShowingBookingService { get; set; }

        public override void Configure()
        {
            Post("/showings");
            AllowAnonymous();
            Summary(s => s.Summary = "Create a public showing booking");
        }

        public override async Task HandleAsync(CreateShowingBookingRequest req, CancellationToken ct)
        {
            await Send.OkAsync(await ShowingBookingService.CreateAsync(req, ct), ct);
        }
    }

    public class GetShowingBookingsEndpoint : Endpoint<GetShowingBookingsEndpoint.Request, PaginatedResult<ShowingBookingResponse>>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required ShowingBookingService ShowingBookingService { get; set; }

        public class Request
        {
            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;

            [QueryParam]
            public ShowingBookingStatus? Status { get; set; }

            [QueryParam]
            public int? AgentId { get; set; }

            [QueryParam]
            public int? PropertyId { get; set; }
        }

        public override void Configure()
        {
            Get("/showings");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get showing bookings");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await ShowingBookingService.GetAsync(req.Page, req.PageSize, req.Status, req.AgentId, req.PropertyId, ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class UpdateShowingBookingEndpoint : Endpoint<UpdateShowingBookingRequest, ShowingBookingResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required ShowingBookingService ShowingBookingService { get; set; }

        public override void Configure()
        {
            Patch("/showings");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Update showing status");
        }

        public override async Task HandleAsync(UpdateShowingBookingRequest req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await ShowingBookingService.UpdateAsync(req, GetActor(HttpContext.User), ct);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }

        private static string GetActor(ClaimsPrincipal user)
            => user.FindFirst("fullName")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value ?? "CRM";
    }

    public class GetShowingAvailabilityEndpoint : Endpoint<GetShowingAvailabilityEndpoint.Request, List<ShowingAvailabilitySlot>>
    {
        public required ShowingBookingService ShowingBookingService { get; set; }

        public class Request
        {
            [QueryParam]
            public int PropertyId { get; set; }

            [QueryParam]
            public DateTime Date { get; set; }
        }

        public override void Configure()
        {
            Get("/showings/availability");
            AllowAnonymous();
            Summary(s => s.Summary = "Get showing availability slots");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await Send.OkAsync(await ShowingBookingService.GetAvailabilityAsync(req.PropertyId, req.Date, ct), ct);
        }
    }

    public class GetBrokerageApprovalsEndpoint : Endpoint<GetBrokerageApprovalsEndpoint.Request, PaginatedResult<BrokerageApprovalResponse>>
    {
        public required BrokerageApprovalService BrokerageApprovalService { get; set; }

        public class Request
        {
            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;

            [QueryParam]
            public BrokerageApprovalStatus? Status { get; set; }
        }

        public override void Configure()
        {
            Get("/brokerage/approvals");
            Roles("Admin");
            Summary(s => s.Summary = "Get brokerage approval requests");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await Send.OkAsync(await BrokerageApprovalService.GetApprovalsAsync(req.Page, req.PageSize, req.Status, ct), ct);
        }
    }

    public class ReviewBrokerageApprovalEndpoint : Endpoint<ReviewBrokerageApprovalRequest, BrokerageApprovalResponse>
    {
        public required BrokerageApprovalService BrokerageApprovalService { get; set; }

        public override void Configure()
        {
            Patch("/brokerage/approvals");
            Roles("Admin");
            Summary(s => s.Summary = "Approve or reject brokerage approval request");
        }

        public override async Task HandleAsync(ReviewBrokerageApprovalRequest req, CancellationToken ct)
        {
            var result = await BrokerageApprovalService.ReviewAsync(req, GetActor(HttpContext.User), ct);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }

        private static string GetActor(ClaimsPrincipal user)
            => user.FindFirst("fullName")?.Value ?? user.FindFirst(ClaimTypes.Email)?.Value ?? "CRM";
    }

    public class GetLeadAssignmentRulesEndpoint : EndpointWithoutRequest<List<LeadAssignmentRuleResponse>>
    {
        public required LeadAssignmentService LeadAssignmentService { get; set; }

        public override void Configure()
        {
            Get("/lead-assignment-rules");
            Roles("Admin");
            Summary(s => s.Summary = "Get lead assignment rules");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await Send.OkAsync(await LeadAssignmentService.GetRulesAsync(ct), ct);
        }
    }

    public class SaveLeadAssignmentRuleEndpoint : Endpoint<LeadAssignmentRule, LeadAssignmentRuleResponse>
    {
        public required LeadAssignmentService LeadAssignmentService { get; set; }

        public override void Configure()
        {
            Patch("/lead-assignment-rules");
            Roles("Admin");
            Summary(s => s.Summary = "Create or update a lead assignment rule");
        }

        public override async Task HandleAsync(LeadAssignmentRule req, CancellationToken ct)
        {
            await Send.OkAsync(await LeadAssignmentService.SaveRuleAsync(req, ct), ct);
        }
    }

    public class DeleteLeadAssignmentRuleEndpoint : Endpoint<DeleteLeadAssignmentRuleEndpoint.Request>
    {
        public required LeadAssignmentService LeadAssignmentService { get; set; }

        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public override void Configure()
        {
            Delete("/lead-assignment-rules");
            Roles("Admin");
            Summary(s => s.Summary = "Delete a lead assignment rule");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await LeadAssignmentService.DeleteRuleAsync(req.Id, ct);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetBrokerageReportsEndpoint : EndpointWithoutRequest<BrokerageReportsResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required BrokerageReportsService BrokerageReportsService { get; set; }

        public override void Configure()
        {
            Get("/reports/brokerage");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get simple brokerage reports");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Dashboard, ct);
            await Send.OkAsync(await BrokerageReportsService.GetAsync(ct), ct);
        }
    }
}
