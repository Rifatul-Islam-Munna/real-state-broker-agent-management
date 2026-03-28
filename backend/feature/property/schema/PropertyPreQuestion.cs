using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    [Table("property_pre_question")]
    public class PropertyPreQuestion
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("property_id")]
        public int PropertyId { get; set; }

        [Required]
        [Column("prompt")]
        public string Prompt { get; set; } = string.Empty;

        [Column("helper_text")]
        public string HelperText { get; set; } = string.Empty;

        [Column("is_required")]
        public bool IsRequired { get; set; } = true;

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Column("allows_file_upload")]
        public bool AllowsFileUpload { get; set; }

        [Column("attachment_url")]
        public string? AttachmentUrl { get; set; }

        [Column("attachment_object_name")]
        public string? AttachmentObjectName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property Property { get; set; } = null!;
    }
}
