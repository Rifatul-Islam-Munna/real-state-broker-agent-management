using FastEndpoints;

public class DeleteAgentEndpoint(UserService userService) : Endpoint<DeleteAgentEndpoint.Request>
{
    public class Request
    {
        [QueryParam]
        public int Id { get; set; }
    }

    public override void Configure()
    {
        Delete("/users/agents");
        Roles("Admin");
        Summary(s =>
        {
            s.Summary = "Delete an agent user from the admin team page";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var (success, message) = await userService.DeleteAgentAsync(req.Id);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(404, ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
