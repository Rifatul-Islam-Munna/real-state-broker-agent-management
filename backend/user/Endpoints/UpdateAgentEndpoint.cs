using FastEndpoints;

public class UpdateAgentEndpoint(UserService userService) : Endpoint<UpdateAgentRequest, AgentUserOptionResponse>
{
    public override void Configure()
    {
        Patch("/users/agents");
        Roles("Admin");
        Summary(s =>
        {
            s.Summary = "Update an agent user from the admin team page";
        });
    }

    public override async Task HandleAsync(UpdateAgentRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.UpdateAgentAsync(req);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(400, ct);
            return;
        }

        await Send.OkAsync(data!, ct);
    }
}
