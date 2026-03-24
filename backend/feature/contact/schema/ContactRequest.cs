using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum ContactRequestStatus
    {
        New,
        Reviewing,
        Converted
    }

    [Table("contact_request")]
    public class ContactRequest
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

        [Required]
        [Column("message")]
        public string Message { get; set; } = string.Empty;

        [Column("inquiry_type")]
        public string InquiryType { get; set; } = string.Empty;

        [Column("status")]
        public ContactRequestStatus Status { get; set; } = ContactRequestStatus.New;

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
