namespace Models;

public class PropertyOperationsSettingsResponse
{
    public string BusinessName { get; set; } = "Property Operations";
    public string LogoUrl { get; set; } = string.Empty;
    public string BrandColor { get; set; } = "#111827";
    public string PublicBaseUrl { get; set; } = string.Empty;
    public int DefaultExpiryHours { get; set; } = 168;
    public int DefaultMaxUses { get; set; } = 1;
    public bool DefaultOneTime { get; set; } = true;
    public bool RequireName { get; set; } = true;
    public bool RequireEmail { get; set; }
    public bool RequirePhone { get; set; }
    public bool AllowFileUploads { get; set; } = true;
    public bool ShowPropertyAddress { get; set; } = true;
    public bool AutoCloseRecordOnSubmit { get; set; }
    public bool NotifyAdminOnSubmit { get; set; } = true;
    public string WelcomeMessage { get; set; } = string.Empty;
    public string TermsText { get; set; } = string.Empty;
    public string EmailSubjectTemplate { get; set; } = string.Empty;
    public string EmailBodyTemplate { get; set; } = string.Empty;
    public string SmsTemplate { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public sealed class UpdatePropertyOperationsSettingsRequest : PropertyOperationsSettingsResponse
{
}

public sealed class CreatePropertyOperationsPublicAccessRequest
{
    public int PropertyId { get; set; }
    public int? RecordId { get; set; }
    public string ModuleKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string RecipientLabel { get; set; } = "External recipient";
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string FormSchemaJson { get; set; } = "[]";
    public int? ExpiryHours { get; set; }
    public int? MaxUses { get; set; }
    public bool? OneTime { get; set; }
    public bool? AllowFileUploads { get; set; }
}

public sealed class PropertyOperationsPublicAccessResponse
{
    public int Id { get; set; }
    public int PropertyId { get; set; }
    public int? RecordId { get; set; }
    public string ModuleKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string RecipientLabel { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientEmail { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string FormSchemaJson { get; set; } = "[]";
    public DateTime ExpiresAt { get; set; }
    public int MaxUses { get; set; }
    public int UseCount { get; set; }
    public bool OneTime { get; set; }
    public bool AllowFileUploads { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string PropertyTitle { get; set; } = string.Empty;
    public string PropertyLocation { get; set; } = string.Empty;
    public string? PublicUrl { get; set; }
    public string? AccessToken { get; set; }
    public int SubmissionCount { get; set; }
}

public sealed class PropertyOperationsPublicSubmissionResponse
{
    public int Id { get; set; }
    public string ResponderName { get; set; } = string.Empty;
    public string ResponderEmail { get; set; } = string.Empty;
    public string ResponderPhone { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string ResponseJson { get; set; } = "{}";
    public string AttachmentUrlsJson { get; set; } = "[]";
    public DateTime SubmittedAt { get; set; }
}

public sealed class PublicPropertyOperationsRequestResponse
{
    public string BusinessName { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string BrandColor { get; set; } = string.Empty;
    public string WelcomeMessage { get; set; } = string.Empty;
    public string TermsText { get; set; } = string.Empty;
    public bool RequireName { get; set; }
    public bool RequireEmail { get; set; }
    public bool RequirePhone { get; set; }
    public bool AllowFileUploads { get; set; }
    public bool ShowPropertyAddress { get; set; }
    public string PropertyTitle { get; set; } = string.Empty;
    public string PropertyLocation { get; set; } = string.Empty;
    public string ModuleKey { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string RecipientLabel { get; set; } = string.Empty;
    public string FormSchemaJson { get; set; } = "[]";
    public DateTime ExpiresAt { get; set; }
    public int RemainingUses { get; set; }
}

public class SubmitPropertyOperationsPublicRequest
{
    public string ResponderName { get; set; } = string.Empty;
    public string ResponderEmail { get; set; } = string.Empty;
    public string ResponderPhone { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string ResponseJson { get; set; } = "{}";
    public string AttachmentUrlsJson { get; set; } = "[]";
}

public sealed class PropertyOperationsAnalyticsResponse
{
    public int ImportedProperties { get; set; }
    public int TotalRecords { get; set; }
    public int OpenRecords { get; set; }
    public int OverdueRecords { get; set; }
    public int CompletedRecords { get; set; }
    public int ActivePublicLinks { get; set; }
    public int CompletedPublicLinks { get; set; }
    public int AnonymousSubmissions { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public Dictionary<string, int> RecordsByModule { get; set; } = new();
    public Dictionary<string, int> RecordsByStatus { get; set; } = new();
}

public sealed class PropertyOperationsActivityResponse
{
    public int Id { get; set; }
    public int? PropertyId { get; set; }
    public string ModuleKey { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public string ActorType { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string MetadataJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }
}
