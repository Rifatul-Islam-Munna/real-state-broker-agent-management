using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum MailInboxStatus
    {
        New,
        Replied,
        Converted
    }

    public enum MailInboxKind
    {
        Newsletter,
        Direct
    }

    [Table("mail_inbox")]
    public class MailInboxItem
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("email")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("subject")]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [Column("message")]
        public string Message { get; set; } = string.Empty;

        [Column("kind")]
        public MailInboxKind Kind { get; set; } = MailInboxKind.Direct;

        [Column("status")]
        public MailInboxStatus Status { get; set; } = MailInboxStatus.New;

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
