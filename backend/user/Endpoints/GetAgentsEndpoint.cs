using FastEndpoints;

public class GetAgentsEndpoint(UserService userService) : EndpointWithoutRequest<List<AgentUserOptionResponse>>
{
    public override void Configure()
    {
        Get("/users/agents");
        Roles("Admin", "Agent");
        Summary(s =>
        {
            s.Summary = "Get active agent users for assignment dropdowns";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var agents = await userService.GetActiveAgentsAsync();
        await Send.OkAsync(agents, ct);
    }
}
