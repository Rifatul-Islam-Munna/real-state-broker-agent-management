using FastEndpoints;

public class RegisterEndpoint(UserService userService) : Endpoint<RegisterRequest, AuthResponse>
{
    public override void Configure()
    {
        Post("/auth/register");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Register a new user";
        });
    }

    public override async Task HandleAsync(RegisterRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.RegisterAsync(req);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(400);
            return;
        }

        await Send.CreatedAtAsync<GetMeEndpoint>(
          routeValues: new { id = data!.Id },
          responseBody: data
      );
    }

}
