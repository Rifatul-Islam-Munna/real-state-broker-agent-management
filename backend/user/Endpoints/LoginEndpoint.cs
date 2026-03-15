using FastEndpoints;

public class LoginEndpoint(UserService userService) : Endpoint<LoginRequest, AuthResponse>
{
    public override void Configure()
    {
        Post("/auth/login");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Login and get access + refresh token";
        });
    }
    public override async Task HandleAsync(LoginRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.LoginAsync(req);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(400);
            return;
        }

        await Send.OkAsync(data!);
    }

}
