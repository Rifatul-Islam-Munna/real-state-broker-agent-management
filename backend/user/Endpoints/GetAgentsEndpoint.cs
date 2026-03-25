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

public class GetPublicAgentsEndpoint(UserService userService) : EndpointWithoutRequest<List<PublicAgentProfileResponse>>
{
    public override void Configure()
    {
        Get("/public/agents");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get public agent profiles for the homepage and agents directory";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var agents = await userService.GetPublicAgentsAsync();
        await Send.OkAsync(agents, ct);
    }
}
