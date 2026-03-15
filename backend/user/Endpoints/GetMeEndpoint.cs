using FastEndpoints;
using System.Security.Claims;



public class GetMeEndpoint(UserService userService) : EndpointWithoutRequest<UserResponse>
{
    public override void Configure()
    {
        Get("/auth/me");
        Roles("Admin", "Agent", "Client");
        Summary(s =>
        {
            s.Summary = "Get current logged in user";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userIdClaim = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (userIdClaim is null)
        {
            await Send.UnauthorizedAsync();
            return;
        }

        var user = await userService.GetMeAsync(int.Parse(userIdClaim));

        if (user is null)
        {
            await Send.NotFoundAsync();
            return;
        }

        await Send.OkAsync(user);
    }

}
