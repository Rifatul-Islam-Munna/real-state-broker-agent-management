using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum ShowingBookingStatus
    {
        Scheduled,
        Completed,
        Canceled,
        NoShow
    }

    public enum BrokerageApprovalType
    {
        ListingPublish,
        PriceChange
    }

    public enum BrokerageApprovalStatus
    {
        Pending,
        Approved,
        Rejected
    }

    [Table("showing_booking")]
    public class ShowingBooking
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Required]
        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property? Property { get; set; }

        [Column("agent_id")]
        public int? AgentId { get; set; }

        [ForeignKey(nameof(AgentId))]
        [JsonIgnore]
        public User? Agent { get; set; }

        [Column("contact_name")]
        public string ContactName { get; set; } = string.Empty;

        [Column("contact_email")]
        public string ContactEmail { get; set; } = string.Empty;

        [Column("contact_phone")]
        public string ContactPhone { get; set; } = string.Empty;

        [Column("start_at")]
        public DateTime StartAt { get; set; }

        [Column("end_at")]
        public DateTime EndAt { get; set; }

        [Column("status")]
        public ShowingBookingStatus Status { get; set; } = ShowingBookingStatus.Scheduled;

        [Column("notes")]
        public string Notes { get; set; } = string.Empty;

        [Column("showing_agent_name")]
        public string ShowingAgentName { get; set; } = string.Empty;

        [Column("showing_agent_email")]
        public string ShowingAgentEmail { get; set; } = string.Empty;

        [Column("showing_agent_phone")]
        public string ShowingAgentPhone { get; set; } = string.Empty;

        [Column("feedback_requested_at")]
        public DateTime? FeedbackRequestedAt { get; set; }

        [Column("feedback_received_at")]
        public DateTime? FeedbackReceivedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("lead_assignment_rule")]
    public class LeadAssignmentRule
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("area")]
        public string Area { get; set; } = string.Empty;

        [Column("property_type")]
        public PropertyCategory? PropertyType { get; set; }

        [Column("listing_type")]
        public PropertyListingType? ListingType { get; set; }

        [Required]
        [Column("agent_id")]
        public int AgentId { get; set; }

        [ForeignKey(nameof(AgentId))]
        [JsonIgnore]
        public User? Agent { get; set; }

        [Column("priority_order")]
        public int PriorityOrder { get; set; } = 100;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("brokerage_approval_request")]
    public class BrokerageApprovalRequest
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("type")]
        public BrokerageApprovalType Type { get; set; }

        [Column("status")]
        public BrokerageApprovalStatus Status { get; set; } = BrokerageApprovalStatus.Pending;

        [Required]
        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property? Property { get; set; }

        [Column("old_price")]
        public string OldPrice { get; set; } = string.Empty;

        [Column("requested_price")]
        public string RequestedPrice { get; set; } = string.Empty;

        [Column("old_status")]
        public PropertyStatus? OldStatus { get; set; }

        [Column("requested_status")]
        public PropertyStatus? RequestedStatus { get; set; }

        [Column("requested_by")]
        public string RequestedBy { get; set; } = string.Empty;

        [Column("reviewed_by")]
        public string ReviewedBy { get; set; } = string.Empty;

        [Column("request_note")]
        public string RequestNote { get; set; } = string.Empty;

        [Column("review_note")]
        public string ReviewNote { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("brokerage_audit_log")]
    public class BrokerageAuditLog
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("entity_type")]
        public string EntityType { get; set; } = string.Empty;

        [Column("entity_id")]
        public int? EntityId { get; set; }

        [Column("action")]
        public string Action { get; set; } = string.Empty;

        [Column("field_name")]
        public string FieldName { get; set; } = string.Empty;

        [Column("old_value")]
        public string OldValue { get; set; } = string.Empty;

        [Column("new_value")]
        public string NewValue { get; set; } = string.Empty;

        [Column("actor")]
        public string Actor { get; set; } = string.Empty;

        [Column("note")]
        public string Note { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
