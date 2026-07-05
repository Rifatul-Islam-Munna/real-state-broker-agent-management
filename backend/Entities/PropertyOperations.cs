using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace Entities
{
    [Table("property_operations_workspace")]
    [Index(nameof(PropertyId), IsUnique = true)]
    public class PropertyOperationsWorkspace
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("property_id")]
        public int PropertyId { get; set; }

        [Column("status")]
        [MaxLength(40)]
        public string Status { get; set; } = "Active";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(PropertyId))]
        public Property Property { get; set; } = null!;

        public List<PropertyOperationsModuleState> ModuleStates { get; set; } = new();
        public List<PropertyOperationsRecord> Records { get; set; } = new();
    }

    [Table("property_operations_module_state")]
    [Index(nameof(WorkspaceId), nameof(ModuleKey), IsUnique = true)]
    public class PropertyOperationsModuleState
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("workspace_id")]
        public int WorkspaceId { get; set; }

        [Required]
        [Column("module_key")]
        [MaxLength(80)]
        public string ModuleKey { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        [MaxLength(40)]
        public string Status { get; set; } = "Not started";

        [Column("notes")]
        public string Notes { get; set; } = string.Empty;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(WorkspaceId))]
        [JsonIgnore]
        public PropertyOperationsWorkspace Workspace { get; set; } = null!;
    }

    [Table("property_operations_record")]
    [Index(nameof(WorkspaceId), nameof(ModuleKey))]
    [Index(nameof(Status))]
    [Index(nameof(DueAt))]
    public class PropertyOperationsRecord
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("workspace_id")]
        public int WorkspaceId { get; set; }

        [Required]
        [Column("module_key")]
        [MaxLength(80)]
        public string ModuleKey { get; set; } = string.Empty;

        [Required]
        [Column("record_type")]
        [MaxLength(80)]
        public string RecordType { get; set; } = "Item";

        [Required]
        [Column("title")]
        [MaxLength(240)]
        public string Title { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Required]
        [Column("status")]
        [MaxLength(60)]
        public string Status { get; set; } = "Open";

        [Column("priority")]
        [MaxLength(40)]
        public string Priority { get; set; } = "Normal";

        [Column("contact_name")]
        [MaxLength(160)]
        public string ContactName { get; set; } = string.Empty;

        [Column("contact_email")]
        [MaxLength(240)]
        public string ContactEmail { get; set; } = string.Empty;

        [Column("contact_phone")]
        [MaxLength(80)]
        public string ContactPhone { get; set; } = string.Empty;

        [Column("amount", TypeName = "numeric(18,2)")]
        public decimal? Amount { get; set; }

        [Column("due_at")]
        public DateTime? DueAt { get; set; }

        [Column("payload_json", TypeName = "jsonb")]
        public string PayloadJson { get; set; } = "{}";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(WorkspaceId))]
        [JsonIgnore]
        public PropertyOperationsWorkspace Workspace { get; set; } = null!;
    }
}
