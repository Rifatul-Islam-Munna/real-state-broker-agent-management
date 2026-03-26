using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Data;

public class UserService(AppDbContext db, IConfiguration config)
{
    private readonly string _jwtSecret = config["Jwt:Secret"]!;
    private readonly int _accessTokenMinutes = 60 * 24 * 10;
    private readonly int _refreshTokenDays = 10;

    // ─── Register ─────────────────────────────────────────
    public async Task<(bool Success, string Message, AuthResponse? Data)> RegisterAsync(RegisterRequest req)
    {
        if (await db.Users.AnyAsync(u => u.Email == req.Email))
            return (false, "Email already exists", null);

        if (req.Phone != null && await db.Users.AnyAsync(u => u.Phone == req.Phone))
            return (false, "Phone already exists", null);

        var user = new User
        {
            FirstName = req.FirstName,
            LastName = req.LastName,
            Email = req.Email.ToLower().Trim(),
            Phone = req.Phone,
            Role = req.Role,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return (true, "Registered successfully", await GenerateAuthResponse(user));
    }

    // ─── Login ────────────────────────────────────────────
    public async Task<(bool Success, string Message, AuthResponse? Data)> LoginAsync(LoginRequest req)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.ToLower().Trim());

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return (false, "Invalid email or password", null);

        if (!user.IsActive)
            return (false, "Account is deactivated", null);

        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return (true, "Login successful", await GenerateAuthResponse(user));
    }

    // ─── Refresh Token ────────────────────────────────────
    public async Task<(bool Success, string Message, AuthResponse? Data)> RefreshTokenAsync(string refreshToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u =>
            u.RefreshToken == refreshToken &&
            u.RefreshTokenExpiry > DateTime.UtcNow);

        if (user is null)
            return (false, "Invalid or expired refresh token", null);

        return (true, "Token refreshed", await GenerateAuthResponse(user));
    }

    // ─── Get Me ───────────────────────────────────────────
    public async Task<UserResponse?> GetMeAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return null;

        return MapToUserResponse(user);
    }

    public async Task<List<AgentUserOptionResponse>> GetAgentsAsync(bool includeInactive = false)
    {
        var query = db.Users
            .Include(user => user.Properties)
            .Where(user => user.Role == UserRole.Agent && user.DeletedAt == null);

        if (!includeInactive)
        {
            query = query.Where(user => user.IsActive);
        }

        var agentUsers = await query
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .ToListAsync();

        return agentUsers
            .Select(MapToAgentUserOption)
            .ToList();
    }

    public async Task<List<PublicAgentProfileResponse>> GetPublicAgentsAsync()
    {
        return await db.Users
            .Where(user => user.Role == UserRole.Agent && user.IsActive && user.DeletedAt == null)
            .OrderByDescending(user => user.IsVerifiedAgent)
            .ThenByDescending(user => user.Properties.Count())
            .ThenByDescending(user => user.CreatedAt)
            .ThenBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new PublicAgentProfileResponse
            {
                Id = user.Id,
                FullName = (((user.FirstName ?? string.Empty) + " " + (user.LastName ?? string.Empty)).Trim()),
                AvatarUrl = user.AvatarUrl,
                AgencyName = user.AgencyName,
                Bio = user.Bio,
                IsVerifiedAgent = user.IsVerifiedAgent,
                PropertyCount = user.Properties.Count()
            })
            .ToListAsync();
    }

    public async Task<(bool Success, string Message, AgentUserOptionResponse? Data)> CreateAgentAsync(CreateAgentRequest req)
    {
        var firstName = (req.FirstName ?? string.Empty).Trim();
        var lastName = (req.LastName ?? string.Empty).Trim();
        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var phone = (req.Phone ?? string.Empty).Trim();
        var password = req.Password ?? string.Empty;

        if (firstName.Length == 0)
            return (false, "First name is required", null);

        if (lastName.Length == 0)
            return (false, "Last name is required", null);

        if (email.Length == 0)
            return (false, "Email is required", null);

        if (password.Length < 6)
            return (false, "Password must be at least 6 characters", null);

        if (await db.Users.AnyAsync(u => u.Email == email))
            return (false, "Email already exists", null);

        if (phone.Length > 0 && await db.Users.AnyAsync(u => u.Phone == phone))
            return (false, "Phone already exists", null);

        if (!TryNormalizeAgentRoutePermissions(
                req.UseCustomAgentRoutePermissions,
                req.AgentRoutePermissions,
                out var normalizedPermissions,
                out var permissionError))
        {
            return (false, permissionError, null);
        }

        var user = new User
        {
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Phone = phone.Length > 0 ? phone : null,
            AvatarUrl = NullIfEmpty(req.AvatarUrl),
            AgencyName = NullIfEmpty(req.AgencyName),
            LicenseNumber = NullIfEmpty(req.LicenseNumber),
            Bio = NullIfEmpty(req.Bio),
            CommissionRate = req.CommissionRate,
            Role = UserRole.Agent,
            IsVerifiedAgent = req.IsVerifiedAgent,
            IsActive = req.IsActive,
            IsEmailVerified = false,
            HasCustomAgentRoutePermissions = req.UseCustomAgentRoutePermissions,
            AgentRoutePermissions = req.UseCustomAgentRoutePermissions
                ? normalizedPermissions
                : [],
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return (true, "Agent created successfully", MapToAgentUserOption(user));
    }

    public async Task<(bool Success, string Message, AgentUserOptionResponse? Data)> UpdateAgentAsync(UpdateAgentRequest req)
    {
        var agent = await db.Users
            .FirstOrDefaultAsync(user =>
                user.Id == req.Id &&
                user.Role == UserRole.Agent &&
                user.DeletedAt == null);

        if (agent is null)
        {
            return (false, "Agent not found", null);
        }

        var firstName = (req.FirstName ?? string.Empty).Trim();
        var lastName = (req.LastName ?? string.Empty).Trim();
        var email = (req.Email ?? string.Empty).Trim().ToLowerInvariant();
        var phone = (req.Phone ?? string.Empty).Trim();
        var password = (req.Password ?? string.Empty).Trim();

        if (firstName.Length == 0)
            return (false, "First name is required", null);

        if (lastName.Length == 0)
            return (false, "Last name is required", null);

        if (email.Length == 0)
            return (false, "Email is required", null);

        if (password.Length > 0 && password.Length < 6)
            return (false, "Password must be at least 6 characters", null);

        if (await db.Users.AnyAsync(u => u.Id != agent.Id && u.Email == email))
            return (false, "Email already exists", null);

        if (phone.Length > 0 && await db.Users.AnyAsync(u => u.Id != agent.Id && u.Phone == phone))
            return (false, "Phone already exists", null);

        if (!TryNormalizeAgentRoutePermissions(
                req.UseCustomAgentRoutePermissions,
                req.AgentRoutePermissions,
                out var normalizedPermissions,
                out var permissionError))
        {
            return (false, permissionError, null);
        }

        agent.FirstName = firstName;
        agent.LastName = lastName;
        agent.Email = email;
        agent.Phone = phone.Length > 0 ? phone : null;
        agent.AvatarUrl = NullIfEmpty(req.AvatarUrl);
        agent.AgencyName = NullIfEmpty(req.AgencyName);
        agent.LicenseNumber = NullIfEmpty(req.LicenseNumber);
        agent.Bio = NullIfEmpty(req.Bio);
        agent.CommissionRate = req.CommissionRate;
        agent.IsVerifiedAgent = req.IsVerifiedAgent;
        agent.IsActive = req.IsActive;
        agent.HasCustomAgentRoutePermissions = req.UseCustomAgentRoutePermissions;
        agent.AgentRoutePermissions = req.UseCustomAgentRoutePermissions
            ? normalizedPermissions
            : [];
        agent.UpdatedAt = DateTime.UtcNow;

        if (password.Length > 0)
        {
            agent.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        }

        await db.SaveChangesAsync();

        return (true, "Agent updated successfully", await GetAgentUserOptionByIdAsync(agent.Id));
    }

    public async Task<(bool Success, string Message, AgentUserOptionResponse? Data)> UpdateAgentRoutePermissionsAsync(
        UpdateAgentRoutePermissionsRequest req)
    {
        var agent = await db.Users.FirstOrDefaultAsync(user =>
            user.Id == req.AgentId &&
            user.Role == UserRole.Agent &&
            user.DeletedAt == null);

        if (agent is null)
        {
            return (false, "Agent not found", null);
        }

        if (!TryNormalizeAgentRoutePermissions(
                req.UseCustomAgentRoutePermissions,
                req.AgentRoutePermissions,
                out var normalizedPermissions,
                out var permissionError))
        {
            return (false, permissionError, null);
        }

        agent.HasCustomAgentRoutePermissions = req.UseCustomAgentRoutePermissions;
        agent.AgentRoutePermissions = req.UseCustomAgentRoutePermissions
            ? normalizedPermissions
            : [];
        agent.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return (true, "Agent access updated successfully", await GetAgentUserOptionByIdAsync(agent.Id));
    }

    public async Task<(bool Success, string Message)> DeleteAgentAsync(int agentId)
    {
        var agent = await db.Users
            .Include(user => user.Properties)
            .FirstOrDefaultAsync(user =>
                user.Id == agentId &&
                user.Role == UserRole.Agent &&
                user.DeletedAt == null);

        if (agent is null)
        {
            return (false, "Agent not found");
        }

        var now = DateTime.UtcNow;

        foreach (var property in agent.Properties)
        {
            property.AgentId = null;
            property.UpdatedAt = now;
        }

        agent.IsActive = false;
        agent.RefreshToken = null;
        agent.RefreshTokenExpiry = null;
        agent.DeletedAt = now;
        agent.UpdatedAt = now;

        await db.SaveChangesAsync();

        return (true, "Agent deleted successfully");
    }

    // ─── Token Generation ─────────────────────────────────
    private async Task<AuthResponse> GenerateAuthResponse(User user)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        var expiry = DateTime.UtcNow.AddMinutes(_accessTokenMinutes);

        // Save refresh token to DB
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(_refreshTokenDays);
        await db.SaveChangesAsync();

        return new AuthResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role.ToString(),
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            AccessTokenExpiry = expiry
        };
    }

    private string GenerateAccessToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role.ToString()),
            new Claim("fullName", user.FullName),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_accessTokenMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    public static List<string> GetEffectiveAgentRoutePermissions(User user)
    {
        if (user.Role != UserRole.Agent)
        {
            return [];
        }

        if (!user.HasCustomAgentRoutePermissions)
        {
            return [.. AgentRoutePermissions.All];
        }

        return AgentRoutePermissions.Normalize(user.AgentRoutePermissions);
    }

    private static UserResponse MapToUserResponse(User user) => new()
    {
        Id = user.Id,
        FirstName = user.FirstName,
        LastName = user.LastName,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        AvatarUrl = user.AvatarUrl,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        IsEmailVerified = user.IsEmailVerified,
        CreatedAt = user.CreatedAt,
        AgentRoutePermissions = GetEffectiveAgentRoutePermissions(user)
    };

    private static AgentUserOptionResponse MapToAgentUserOption(User user) => new()
    {
        Id = user.Id,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        AvatarUrl = user.AvatarUrl,
        AgencyName = user.AgencyName,
        LicenseNumber = user.LicenseNumber,
        CommissionRate = user.CommissionRate,
        Role = user.Role.ToString(),
        IsActive = user.IsActive,
        IsVerifiedAgent = user.IsVerifiedAgent,
        Bio = user.Bio,
        CreatedAt = user.CreatedAt,
        PropertyCount = user.Properties.Count,
        HasCustomAgentRoutePermissions = user.HasCustomAgentRoutePermissions,
        AgentRoutePermissions = GetEffectiveAgentRoutePermissions(user)
    };

    private async Task<AgentUserOptionResponse?> GetAgentUserOptionByIdAsync(int agentId)
    {
        var user = await db.Users
            .Include(item => item.Properties)
            .FirstOrDefaultAsync(item =>
                item.Id == agentId &&
                item.Role == UserRole.Agent &&
                item.DeletedAt == null);

        return user is null ? null : MapToAgentUserOption(user);
    }

    private static bool TryNormalizeAgentRoutePermissions(
        bool useCustomAgentRoutePermissions,
        IEnumerable<string>? routePermissions,
        out List<string> normalizedPermissions,
        out string errorMessage)
    {
        normalizedPermissions = AgentRoutePermissions.Normalize(routePermissions);
        errorMessage = string.Empty;

        if (useCustomAgentRoutePermissions && normalizedPermissions.Count == 0)
        {
            errorMessage = "Select at least one agent route.";
            return false;
        }

        return true;
    }

    private static string? NullIfEmpty(string? value)
    {
        var trimmed = (value ?? string.Empty).Trim();
        return trimmed.Length > 0 ? trimmed : null;
    }
}
