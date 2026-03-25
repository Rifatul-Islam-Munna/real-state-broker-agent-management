using FastEndpoints;

public class UpdateAgentPermissionsEndpoint(UserService userService)
    : Endpoint<UpdateAgentRoutePermissionsRequest, AgentUserOptionResponse>
{
    public override void Configure()
    {
        Patch("/users/agents/permissions");
        Roles("Admin");
        Summary(s => s.Summary = "Update allowed agent portal routes");
    }

    public override async Task HandleAsync(UpdateAgentRoutePermissionsRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.UpdateAgentRoutePermissionsAsync(req);

        if (!success || data is null)
        {
            AddError(message);
            await Send.ErrorsAsync(404, ct);
            return;
        }

        await Send.OkAsync(data, ct);
    }
}
