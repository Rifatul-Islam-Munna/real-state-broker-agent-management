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

        [Column("stage")]
        public DealStage Stage { get; set; } = DealStage.OfferMade;

        [Column("deadline")]
        public string Deadline { get; set; } = string.Empty;

        [Column("note")]
        public string Note { get; set; } = string.Empty;

        [Column("agent")]
        public string Agent { get; set; } = string.Empty;

        [Column("source_lead_id")]
        public int? SourceLeadId { get; set; }

        [ForeignKey(nameof(SourceLeadId))]
        [JsonIgnore]
        public Lead? SourceLead { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
