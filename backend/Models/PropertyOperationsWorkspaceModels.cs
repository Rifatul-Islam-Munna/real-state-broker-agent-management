namespace Models
{
    public sealed class PropertyOperationsModuleStateResponse
    {
        public int Id { get; set; }
        public string ModuleKey { get; set; } = string.Empty;
        public string Status { get; set; } = "Not started";
        public string Notes { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public sealed class PropertyOperationsWorkspaceResponse
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string Status { get; set; } = "Active";
        public string PropertyTitle { get; set; } = string.Empty;
        public string PropertyLocation { get; set; } = string.Empty;
        public string PropertyType { get; set; } = string.Empty;
        public string ListingType { get; set; } = string.Empty;
        public string PropertyStatus { get; set; } = string.Empty;
        public string PropertySlug { get; set; } = string.Empty;
        public string ThumbnailUrl { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<PropertyOperationsModuleStateResponse> ModuleStates { get; set; } = new();
    }

    public sealed class ImportPropertyOperationsRequest
    {
        public List<int> PropertyIds { get; set; } = new();
    }

    public sealed class UpdatePropertyOperationsModuleStateRequest
    {
        public int PropertyId { get; set; }
        public string ModuleKey { get; set; } = string.Empty;
        public string Status { get; set; } = "Not started";
        public string Notes { get; set; } = string.Empty;
    }
}
