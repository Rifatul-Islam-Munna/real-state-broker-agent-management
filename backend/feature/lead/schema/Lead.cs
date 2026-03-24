using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum LeadStage
    {
        New,
        Contacted,
        Pending,
        Qualified,
        Visit,
        Negotiation,
        Deal,
        Canceled
    }

    public enum LeadPriority
    {
        HighPriority,
        Warm,
        FollowUp
    }

    [Table("lead")]
    public class Lead
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Required]
        [Column("email")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Column("phone")]
        public string Phone { get; set; } = string.Empty;

        [Column("summary")]
        public string Summary { get; set; } = string.Empty;

        [Column("property_name")]
        public string Property { get; set; } = string.Empty;

        [Column("budget")]
        public string Budget { get; set; } = string.Empty;

        [Column("stage")]
        public LeadStage Stage { get; set; } = LeadStage.New;

        [Column("priority")]
        public LeadPriority Priority { get; set; } = LeadPriority.Warm;

        [Column("agent")]
        public string Agent { get; set; } = string.Empty;

        [Column("source")]
        public string Source { get; set; } = string.Empty;

        [Column("interest")]
        public string Interest { get; set; } = string.Empty;

        [Column("timeline")]
        public string Timeline { get; set; } = string.Empty;

        [Column("in_board")]
        public bool InBoard { get; set; }

        [Column("notes", TypeName = "jsonb")]
        public List<string> Notes { get; set; } = new();

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_activity_at")]
        public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public List<DealPipeline> Deals { get; set; } = [];

        [JsonIgnore]
        public List<ContactRequest> ContactRequests { get; set; } = [];

        [JsonIgnore]
        public List<MailInboxItem> MailInboxItems { get; set; } = [];
    }
}
