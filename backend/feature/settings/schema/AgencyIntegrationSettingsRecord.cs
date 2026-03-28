using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities
{
    [Table("agency_integration_settings")]
    public class AgencyIntegrationSettingsRecord
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; }

        [Column("twilio_payload")]
        public string? TwilioPayload { get; set; }

        [Column("twilio_updated_at")]
        public DateTime? TwilioUpdatedAt { get; set; }

        [Column("ai_provider_payload")]
        public string? AiProviderPayload { get; set; }

        [Column("ai_provider_updated_at")]
        public DateTime? AiProviderUpdatedAt { get; set; }

        [Column("smtp_payload")]
        public string? SmtpPayload { get; set; }

        [Column("smtp_updated_at")]
        public DateTime? SmtpUpdatedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
