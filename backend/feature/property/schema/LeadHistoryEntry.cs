using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum LeadHistoryKind
    {
        Note,
        Email,
        Sms,
        Call,
        PropertyChat,
        ContactForm,
        MailInbox,
        System
    }

    public enum LeadHistoryDirection
    {
        Incoming,
        Outgoing,
        Internal,
        Scheduled,
        System
    }

    public enum LeadHistoryStatus
    {
        Logged,
        Scheduled,
        Sent,
        Received,
        Completed,
        Failed
    }

    [Table("lead_history")]
    public class LeadHistoryEntry
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("lead_id")]
        public int LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Column("kind")]
        public LeadHistoryKind Kind { get; set; } = LeadHistoryKind.Note;

        [Column("direction")]
        public LeadHistoryDirection Direction { get; set; } = LeadHistoryDirection.Internal;

        [Column("status")]
        public LeadHistoryStatus Status { get; set; } = LeadHistoryStatus.Logged;

        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("summary")]
        public string Summary { get; set; } = string.Empty;

        [Column("body")]
        public string Body { get; set; } = string.Empty;

        [Column("provider")]
        public string Provider { get; set; } = string.Empty;

        [Column("created_by")]
        public string CreatedBy { get; set; } = string.Empty;

        [Column("scheduled_at")]
        public DateTime? ScheduledAt { get; set; }

        [Column("occurred_at")]
        public DateTime? OccurredAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
