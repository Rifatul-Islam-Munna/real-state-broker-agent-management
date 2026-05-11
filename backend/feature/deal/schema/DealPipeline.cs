using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum DealStage
    {
        OfferMade,
        OfferAccepted,
        UnderContract,
        Inspection,
        Financing,
        Closing,
        Completed,
        Canceled
    }

    public enum DealType
    {
        Residential,
        Commercial,
        Industrial
    }

    public enum DealCommissionStatus
    {
        NotReady,
        Estimated,
        ReadyToInvoice,
        Invoiced,
        Paid
    }

    [Table("deal_pipeline")]
    public class DealPipeline
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("type")]
        public DealType Type { get; set; } = DealType.Residential;

        [Required]
        [Column("client")]
        public string Client { get; set; } = string.Empty;

        [Column("value")]
        public decimal Value { get; set; }

        [Column("commission_rate")]
        public decimal CommissionRate { get; set; } = 3m;

        [Column("commission_amount")]
        public decimal CommissionAmount { get; set; }

        [Column("commission_status")]
        public DealCommissionStatus CommissionStatus { get; set; } = DealCommissionStatus.Estimated;

        [Column("commission_payout_note")]
        public string CommissionPayoutNote { get; set; } = string.Empty;

        [Column("stage")]
        public DealStage Stage { get; set; } = DealStage.OfferMade;

        [Column("deadline")]
        public string Deadline { get; set; } = string.Empty;

        [Column("expected_closing_date")]
        public DateTime? ExpectedClosingDate { get; set; }

        [Column("note")]
        public string Note { get; set; } = string.Empty;

        [Column("agent")]
        public string Agent { get; set; } = string.Empty;

        [Column("agent_id")]
        public int? AgentId { get; set; }

        [ForeignKey(nameof(AgentId))]
        [JsonIgnore]
        public User? DealOwner { get; set; }

        [Column("source_lead_id")]
        public int? SourceLeadId { get; set; }

        [ForeignKey(nameof(SourceLeadId))]
        [JsonIgnore]
        public Lead? SourceLead { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public List<DealChecklistItem> ChecklistItems { get; set; } = [];
    }

    [Table("deal_checklist_item")]
    public class DealChecklistItem
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("deal_pipeline_id")]
        public int DealPipelineId { get; set; }

        [ForeignKey(nameof(DealPipelineId))]
        [JsonIgnore]
        public DealPipeline? DealPipeline { get; set; }

        [Required]
        [Column("title")]
        public string Title { get; set; } = string.Empty;

        [Column("is_completed")]
        public bool IsCompleted { get; set; }

        [Column("sort_order")]
        public int SortOrder { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
