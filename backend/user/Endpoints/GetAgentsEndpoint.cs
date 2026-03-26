using FastEndpoints;

public class GetAgentsEndpoint(UserService userService) : Endpoint<GetAgentsEndpoint.Request, List<AgentUserOptionResponse>>
{
    public class Request
    {
        [QueryParam]
        public bool IncludeInactive { get; set; }
    }

    public override void Configure()
    {
        Get("/users/agents");
        Roles("Admin", "Agent");
        Summary(s =>
        {
            s.Summary = "Get active agent users for assignment dropdowns";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var agents = await userService.GetAgentsAsync(req.IncludeInactive);
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
