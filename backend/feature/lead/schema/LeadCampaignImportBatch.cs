using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum LeadCampaignImportStatus
    {
        Completed,
        CompletedWithSkips,
        Failed
    }

    [Table("lead_campaign_import_batch")]
    public class LeadCampaignImportBatch
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("batch_name")]
        public string BatchName { get; set; } = string.Empty;

        [Column("template_name")]
        public string TemplateName { get; set; } = string.Empty;

        [Column("initial_kinds", TypeName = "jsonb")]
        public List<LeadHistoryKind> InitialKinds { get; set; } = [];

        [Column("follow_up_kinds", TypeName = "jsonb")]
        public List<LeadHistoryKind> FollowUpKinds { get; set; } = [];

        [Column("csv_columns", TypeName = "jsonb")]
        public List<string> CsvColumns { get; set; } = [];

        [Column("lead_field_mappings", TypeName = "jsonb")]
        public Dictionary<string, string> LeadFieldMappings { get; set; } = [];

        [Column("variable_mappings", TypeName = "jsonb")]
        public Dictionary<string, string> VariableMappings { get; set; } = [];

        [Column("total_rows")]
        public int TotalRows { get; set; }

        [Column("imported_count")]
        public int ImportedCount { get; set; }

        [Column("sent_count")]
        public int SentCount { get; set; }

        [Column("scheduled_count")]
        public int ScheduledCount { get; set; }

        [Column("skipped_count")]
        public int SkippedCount { get; set; }

        [Column("failed_count")]
        public int FailedCount { get; set; }

        [Column("status")]
        public LeadCampaignImportStatus Status { get; set; } = LeadCampaignImportStatus.Completed;

        [Column("created_by")]
        public string CreatedBy { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public List<LeadCampaignImportItem> Items { get; set; } = [];
    }
}
