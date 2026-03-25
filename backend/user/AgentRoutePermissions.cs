public static class AgentRoutePermissions
{
    public const string Dashboard = "dashboard";
    public const string Properties = "properties";
    public const string DealPipeline = "deal-pipeline";
    public const string Lead = "lead";
    public const string Mail = "mail";
    public const string Settings = "settings";

    public static readonly string[] All =
    [
        Dashboard,
        Properties,
        DealPipeline,
        Lead,
        Mail,
        Settings,
    ];

    public static List<string> Normalize(IEnumerable<string>? permissions)
    {
        return (permissions ?? [])
            .Select(item => (item ?? string.Empty).Trim().ToLowerInvariant())
            .Where(item => All.Contains(item))
            .Distinct(StringComparer.Ordinal)
            .ToList();
    }
}
