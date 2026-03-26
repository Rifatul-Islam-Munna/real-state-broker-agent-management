public class AgentUserOptionResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AgencyName { get; set; }
    public string? LicenseNumber { get; set; }
    public decimal? CommissionRate { get; set; }
    public string Role { get; set; } = "Agent";
    public bool IsActive { get; set; }
    public bool IsVerifiedAgent { get; set; }
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; }
    public int PropertyCount { get; set; }
    public bool HasCustomAgentRoutePermissions { get; set; }
    public List<string> AgentRoutePermissions { get; set; } = [];
}

public class PublicAgentProfileResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = "";
    public string? AvatarUrl { get; set; }
    public string? AgencyName { get; set; }
    public string? Bio { get; set; }
    public bool IsVerifiedAgent { get; set; }
    public int PropertyCount { get; set; }
}

public class CreateAgentRequest
{
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AgencyName { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Bio { get; set; }
    public decimal? CommissionRate { get; set; }
    public bool IsVerifiedAgent { get; set; }
    public bool IsActive { get; set; } = true;
    public bool UseCustomAgentRoutePermissions { get; set; } = false;
    public List<string> AgentRoutePermissions { get; set; } = [];
}

public class UpdateAgentRequest
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Password { get; set; }
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public string? AgencyName { get; set; }
    public string? LicenseNumber { get; set; }
    public string? Bio { get; set; }
    public decimal? CommissionRate { get; set; }
    public bool IsVerifiedAgent { get; set; }
    public bool IsActive { get; set; } = true;
    public bool UseCustomAgentRoutePermissions { get; set; } = false;
    public List<string> AgentRoutePermissions { get; set; } = [];
}

public class UpdateAgentRoutePermissionsRequest
{
    public int AgentId { get; set; }
    public bool UseCustomAgentRoutePermissions { get; set; } = true;
    public List<string> AgentRoutePermissions { get; set; } = [];
}
