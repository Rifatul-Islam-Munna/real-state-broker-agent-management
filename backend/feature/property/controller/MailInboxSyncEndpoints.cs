using FastEndpoints;
using Services;

namespace Endpoints
{
    public class GetMailInboxSyncStatusEndpoint : EndpointWithoutRequest<MailboxSyncStatusResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required MailInboxSyncService MailInboxSyncService { get; set; }

        public override void Configure()
        {
            Get("/mail-inbox/sync-status");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Get mailbox sync status and last runtime details");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            var result = await MailInboxSyncService.GetStatusAsync(ct);
            await Send.OkAsync(result, ct);
        }
    }

    public class RunMailInboxSyncEndpoint : EndpointWithoutRequest<MailboxSyncStatusResponse>
    {
        public required AgentRouteAccessService AgentRouteAccessService { get; set; }
        public required MailInboxSyncService MailInboxSyncService { get; set; }

        public override void Configure()
        {
            Post("/mail-inbox/sync");
            Roles("Admin", "Agent");
            Summary(s => s.Summary = "Run mailbox sync immediately");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            await AgentRouteAccessService.EnsureCanAccessAsync(HttpContext.User, AgentRoutePermissions.Mail, ct);
            var result = await MailInboxSyncService.RunManualSyncAsync(ct);
            await Send.OkAsync(result, ct);
        }
    }
}
