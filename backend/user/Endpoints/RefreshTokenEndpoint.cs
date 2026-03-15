using FastEndpoints;


public class RefreshTokenEndpoint(UserService userService) : Endpoint<RefreshTokenRequest, AuthResponse>
{
    public override void Configure()
    {
        Post("/auth/refresh");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Get new access token using refresh token";
        });
    }

    public override async Task HandleAsync(RefreshTokenRequest req, CancellationToken ct)
    {
        var (success, message, data) = await userService.RefreshTokenAsync(req.RefreshToken);

        if (!success)
        {
            AddError(message);
            await Send.ErrorsAsync(401);
            return;
        }

        await Send.OkAsync(data!);
    }

}
