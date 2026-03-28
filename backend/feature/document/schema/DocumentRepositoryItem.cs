using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities
{
    public enum DocumentAccessLevel
    {
        AdminOnly,
        AgentAccess,
        Public
    }

    [Table("document_repository_item")]
    public class DocumentRepositoryItem
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Required]
        [Column("file_name")]
        public string FileName { get; set; } = string.Empty;

        [Required]
        [Column("file_url")]
        public string FileUrl { get; set; } = string.Empty;

        [Column("file_object_name")]
        public string? FileObjectName { get; set; }

        [Required]
        [Column("mime_type")]
        public string MimeType { get; set; } = string.Empty;

        [Column("size_bytes")]
        public long SizeBytes { get; set; }

        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Column("folder")]
        public string Folder { get; set; } = string.Empty;

        [Column("description")]
        public string Description { get; set; } = string.Empty;

        [Column("version_label")]
        public string VersionLabel { get; set; } = "v1.0";

        [Column("tags", TypeName = "jsonb")]
        public List<string> Tags { get; set; } = [];

        [Column("access_level")]
        public DocumentAccessLevel AccessLevel { get; set; } = DocumentAccessLevel.AdminOnly;

        [Column("is_template")]
        public bool IsTemplate { get; set; }

        [Column("requires_signature")]
        public bool RequiresSignature { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
