using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Data;

public class AgentRouteAccessService(AppDbContext db)
{
    public async Task EnsureCanAccessAsync(
        ClaimsPrincipal principal,
        string requiredPermission,
        CancellationToken ct = default)
    {
        if (principal.IsInRole("Admin"))
        {
            return;
        }

        if (!principal.IsInRole("Agent"))
        {
            throw new UnauthorizedAccessException("You do not have access to this area.");
        }

        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("You do not have access to this area.");
        }

        var user = await db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == userId, ct);

        if (user is null || !user.IsActive)
        {
            throw new UnauthorizedAccessException("You do not have access to this area.");
        }

        var effectivePermissions = UserService.GetEffectiveAgentRoutePermissions(user);
        if (!effectivePermissions.Contains(requiredPermission, StringComparer.Ordinal))
        {
            throw new UnauthorizedAccessException("You do not have access to this area.");
        }
    }
}
