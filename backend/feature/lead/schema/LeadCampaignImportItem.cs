using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum LeadCampaignImportItemStatus
    {
        Imported,
        Sent,
        Scheduled,
        Skipped,
        Failed
    }

    [Table("lead_campaign_import_item")]
    public class LeadCampaignImportItem
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("batch_id")]
        public int BatchId { get; set; }

        [ForeignKey(nameof(BatchId))]
        [JsonIgnore]
        public LeadCampaignImportBatch? Batch { get; set; }

        [Column("row_number")]
        public int RowNumber { get; set; }

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Column("lead_name")]
        public string LeadName { get; set; } = string.Empty;

        [Column("lead_email")]
        public string LeadEmail { get; set; } = string.Empty;

        [Column("lead_phone")]
        public string LeadPhone { get; set; } = string.Empty;

        [Column("raw_data", TypeName = "jsonb")]
        public Dictionary<string, string> RawData { get; set; } = [];

        [Column("rendered_initial_title")]
        public string RenderedInitialTitle { get; set; } = string.Empty;

        [Column("rendered_initial_message")]
        public string RenderedInitialMessage { get; set; } = string.Empty;

        [Column("rendered_follow_up_title")]
        public string RenderedFollowUpTitle { get; set; } = string.Empty;

        [Column("rendered_follow_up_message")]
        public string RenderedFollowUpMessage { get; set; } = string.Empty;

        [Column("initial_history_entry_id")]
        public int? InitialHistoryEntryId { get; set; }

        [Column("follow_up_history_entry_id")]
        public int? FollowUpHistoryEntryId { get; set; }

        [Column("initial_status")]
        public LeadCampaignImportItemStatus InitialStatus { get; set; } = LeadCampaignImportItemStatus.Imported;

        [Column("follow_up_status")]
        public LeadCampaignImportItemStatus? FollowUpStatus { get; set; }

        [Column("skip_reason")]
        public string SkipReason { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
