using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace Entities;

[Table("property_operations_settings")]
public class PropertyOperationsSettingsRecord
{
    [Key]
    [Column("id")]
    public int Id { get; set; } = 1;

    [Column("business_name")]
    [MaxLength(200)]
    public string BusinessName { get; set; } = "Property Operations";

    [Column("logo_url")]
    public string LogoUrl { get; set; } = string.Empty;

    [Column("brand_color")]
    [MaxLength(20)]
    public string BrandColor { get; set; } = "#111827";

    [Column("public_base_url")]
    public string PublicBaseUrl { get; set; } = string.Empty;

    [Column("default_expiry_hours")]
    public int DefaultExpiryHours { get; set; } = 168;

    [Column("default_max_uses")]
    public int DefaultMaxUses { get; set; } = 1;

    [Column("default_one_time")]
    public bool DefaultOneTime { get; set; } = true;

    [Column("require_name")]
    public bool RequireName { get; set; } = true;

    [Column("require_email")]
    public bool RequireEmail { get; set; }

    [Column("require_phone")]
    public bool RequirePhone { get; set; }

    [Column("allow_file_uploads")]
    public bool AllowFileUploads { get; set; } = true;

    [Column("show_property_address")]
    public bool ShowPropertyAddress { get; set; } = true;

    [Column("auto_close_record_on_submit")]
    public bool AutoCloseRecordOnSubmit { get; set; }

    [Column("notify_admin_on_submit")]
    public bool NotifyAdminOnSubmit { get; set; } = true;

    [Column("welcome_message")]
    public string WelcomeMessage { get; set; } = "Please review the request and submit the requested information.";

    [Column("terms_text")]
    public string TermsText { get; set; } = string.Empty;

    [Column("email_subject_template")]
    public string EmailSubjectTemplate { get; set; } = "Property request: {{title}}";

    [Column("email_body_template")]
    public string EmailBodyTemplate { get; set; } = "Open this secure link to complete the property request: {{link}}";

    [Column("sms_template")]
    public string SmsTemplate { get; set; } = "Property request: {{title}} {{link}}";

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Table("property_operations_public_access")]
[Index(nameof(TokenHash), IsUnique = true)]
[Index(nameof(WorkspaceId), nameof(ModuleKey))]
[Index(nameof(Status))]
[Index(nameof(ExpiresAt))]
public class PropertyOperationsPublicAccess
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("workspace_id")]
    public int WorkspaceId { get; set; }

    [Column("record_id")]
    public int? RecordId { get; set; }

    [Required]
    [Column("module_key")]
    [MaxLength(80)]
    public string ModuleKey { get; set; } = string.Empty;

    [Required]
    [Column("title")]
    [MaxLength(240)]
    public string Title { get; set; } = string.Empty;

    [Column("instructions")]
    public string Instructions { get; set; } = string.Empty;

    [Column("recipient_label")]
    [MaxLength(120)]
    public string RecipientLabel { get; set; } = "External recipient";

    [Column("recipient_name")]
    [MaxLength(160)]
    public string RecipientName { get; set; } = string.Empty;

    [Column("recipient_email")]
    [MaxLength(240)]
    public string RecipientEmail { get; set; } = string.Empty;

    [Column("recipient_phone")]
    [MaxLength(80)]
    public string RecipientPhone { get; set; } = string.Empty;

    [Required]
    [Column("token_hash")]
    [MaxLength(64)]
    public string TokenHash { get; set; } = string.Empty;

    [Required]
    [Column("status")]
    [MaxLength(40)]
    public string Status { get; set; } = "Active";

    [Column("form_schema_json", TypeName = "jsonb")]
    public string FormSchemaJson { get; set; } = "[]";

    [Column("expires_at")]
    public DateTime ExpiresAt { get; set; }

    [Column("max_uses")]
    public int MaxUses { get; set; } = 1;

    [Column("use_count")]
    public int UseCount { get; set; }

    [Column("one_time")]
    public bool OneTime { get; set; } = true;

    [Column("allow_file_uploads")]
    public bool AllowFileUploads { get; set; } = true;

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("last_accessed_at")]
    public DateTime? LastAccessedAt { get; set; }

    [Column("completed_at")]
    public DateTime? CompletedAt { get; set; }

    [Column("revoked_at")]
    public DateTime? RevokedAt { get; set; }

    [ForeignKey(nameof(WorkspaceId))]
    [JsonIgnore]
    public PropertyOperationsWorkspace Workspace { get; set; } = null!;

    [ForeignKey(nameof(RecordId))]
    [JsonIgnore]
    public PropertyOperationsRecord? Record { get; set; }

    public List<PropertyOperationsPublicSubmission> Submissions { get; set; } = new();
}

[Table("property_operations_public_submission")]
[Index(nameof(PublicAccessId), nameof(SubmittedAt))]
public class PropertyOperationsPublicSubmission
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("public_access_id")]
    public int PublicAccessId { get; set; }

    [Column("responder_name")]
    [MaxLength(160)]
    public string ResponderName { get; set; } = string.Empty;

    [Column("responder_email")]
    [MaxLength(240)]
    public string ResponderEmail { get; set; } = string.Empty;

    [Column("responder_phone")]
    [MaxLength(80)]
    public string ResponderPhone { get; set; } = string.Empty;

    [Column("notes")]
    public string Notes { get; set; } = string.Empty;

    [Column("response_json", TypeName = "jsonb")]
    public string ResponseJson { get; set; } = "{}";

    [Column("attachment_urls_json", TypeName = "jsonb")]
    public string AttachmentUrlsJson { get; set; } = "[]";

    [Column("submitted_at")]
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(PublicAccessId))]
    [JsonIgnore]
    public PropertyOperationsPublicAccess PublicAccess { get; set; } = null!;
}

[Table("property_operations_activity")]
[Index(nameof(WorkspaceId), nameof(CreatedAt))]
[Index(nameof(EntityType), nameof(EntityId))]
public class PropertyOperationsActivity
{
    [Key]
    [Column("id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Column("workspace_id")]
    public int? WorkspaceId { get; set; }

    [Column("module_key")]
    [MaxLength(80)]
    public string ModuleKey { get; set; } = string.Empty;

    [Column("action")]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [Column("entity_type")]
    [MaxLength(80)]
    public string EntityType { get; set; } = string.Empty;

    [Column("entity_id")]
    public int? EntityId { get; set; }

    [Column("actor_type")]
    [MaxLength(40)]
    public string ActorType { get; set; } = "Admin";

    [Column("summary")]
    public string Summary { get; set; } = string.Empty;

    [Column("metadata_json", TypeName = "jsonb")]
    public string MetadataJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
