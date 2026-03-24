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
    private readonly int _accessTokenMinutes = 60 * 24;
    private readonly int _refreshTokenDays = 7;

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

    public async Task<List<AgentUserOptionResponse>> GetActiveAgentsAsync()
    {
        return await db.Users
            .Where(user => user.Role == UserRole.Agent && user.IsActive && user.DeletedAt == null)
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new AgentUserOptionResponse
            {
                Id = user.Id,
                FullName = (((user.FirstName ?? string.Empty) + " " + (user.LastName ?? string.Empty)).Trim()),
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                AgencyName = user.AgencyName,
                LicenseNumber = user.LicenseNumber,
                CommissionRate = user.CommissionRate,
                Role = "Agent",
                IsActive = user.IsActive,
                IsVerifiedAgent = user.IsVerifiedAgent,
                Bio = user.Bio,
                CreatedAt = user.CreatedAt,
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
            UpdatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();

        return (true, "Agent created successfully", MapToAgentUserOption(user));
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
        CreatedAt = user.CreatedAt
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
        PropertyCount = user.Properties.Count
    };

    private static string? NullIfEmpty(string? value)
    {
        var trimmed = (value ?? string.Empty).Trim();
        return trimmed.Length > 0 ? trimmed : null;
    }
}
