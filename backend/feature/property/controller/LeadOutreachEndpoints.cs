using System.Text;
using Entities;
using FastEndpoints;
using Services;

namespace Endpoints
{
    public class DispatchLeadOutreachEndpoint : Endpoint<LeadOutreachDispatchRequest, LeadHistoryEntryResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadOutreachService LeadOutreachService { get; set; }

        public override void Configure()
        {
            Post("/lead-outreach");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Send or schedule lead email, SMS, or call outreach");
        }

        public override async Task HandleAsync(LeadOutreachDispatchRequest req, CancellationToken ct)
        {
            try
            {
                await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
                var result = await LeadOutreachService.DispatchAsync(req, ct);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
            catch (InvalidOperationException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(404, ct);
            }
        }
    }

    public class GetLeadOutreachScheduleEndpoint : Endpoint<GetLeadOutreachScheduleEndpoint.Request, List<LeadOutreachScheduleResponse>>
    {
        public class Request
        {
            [QueryParam]
            public int? LeadId { get; set; }

            [QueryParam]
            public LeadHistoryKind? Kind { get; set; }

            [QueryParam]
            public LeadHistoryStatus? Status { get; set; }
        }

        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadOutreachService LeadOutreachService { get; set; }

        public override void Configure()
        {
            Get("/lead-outreach/schedule");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Fetch scheduled and delivered lead outreach items");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
            var result = await LeadOutreachService.GetScheduleAsync(req.LeadId, req.Kind, req.Status, ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class DispatchBulkLeadOutreachEndpoint : Endpoint<LeadOutreachBulkDispatchRequest, LeadOutreachBulkDispatchResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required LeadOutreachService LeadOutreachService { get; set; }

        public override void Configure()
        {
            Post("/lead-outreach/bulk");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Send or schedule lead outreach in bulk by lead or deal stage");
        }

        public override async Task HandleAsync(LeadOutreachBulkDispatchRequest req, CancellationToken ct)
        {
            try
            {
                await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Lead, ct);
                var result = await LeadOutreachService.DispatchBulkAsync(req, ct);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
            catch (InvalidOperationException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(404, ct);
            }
        }
    }

    public class LeadCallScriptEndpoint : Endpoint<LeadCallScriptEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int HistoryEntryId { get; set; }

            [QueryParam]
            public string? Provider { get; set; }

            [QueryParam]
            public string? Message { get; set; }

            [QueryParam]
            public string? Title { get; set; }
        }

        public required LeadOutreachService LeadOutreachService { get; set; }

        public override void Configure()
        {
            Get("/lead-outreach/call-script");
            AllowAnonymous();
            Summary(s => s.Summary = "Return a voice XML document for outbound provider callbacks");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            var xml = req.HistoryEntryId > 0
                ? await LeadOutreachService.BuildCallScriptAsync(req.HistoryEntryId, req.Provider, ct)
                : BuildInlineXml(req.Message, req.Provider);

            if (string.IsNullOrWhiteSpace(xml))
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            HttpContext.Response.ContentType = "application/xml; charset=utf-8";
            await HttpContext.Response.WriteAsync(xml, Encoding.UTF8, ct);
        }

        private static string? BuildInlineXml(string? message, string? provider)
        {
            if (string.IsNullOrWhiteSpace(message))
            {
                return null;
            }

            var safeMessage = message
                .Replace("&", "&amp;", StringComparison.Ordinal)
                .Replace("<", "&lt;", StringComparison.Ordinal)
                .Replace(">", "&gt;", StringComparison.Ordinal)
                .Replace("\"", "&quot;", StringComparison.Ordinal)
                .Replace("'", "&apos;", StringComparison.Ordinal);

            return string.Equals(provider, "plivo", StringComparison.OrdinalIgnoreCase)
                ? $"<Response><Speak>{safeMessage}</Speak></Response>"
                : $"<Response><Say>{safeMessage}</Say></Response>";
        }
    }
}
