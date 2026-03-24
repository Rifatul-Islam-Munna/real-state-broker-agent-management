using FastEndpoints;

public class CreateAgentEndpoint(UserService userService) : Endpoint<CreateAgentRequest, AgentUserOptionResponse>
{
    public override void Configure()
    {
        Post("/users/agents");
        Roles("Admin");
        Summary(s =>
        {
            s.Summary = "Create an agent user from the admin team page";
        });
    }

    public override async Task HandleAsync(CreateAgentRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.CreateAgentAsync(req);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(400, ct);
            return;
        }

        await Send.OkAsync(data!, ct);
    }
}
