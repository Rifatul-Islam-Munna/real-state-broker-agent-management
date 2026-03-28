using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Entities
{
    public enum PropertyChatConversationStatus
    {
        New,
        LeadCreated,
        NeedsReview
    }

    public enum PropertyChatSenderRole
    {
        System,
        Visitor,
        Agent
    }

    [Table("property_chat_conversation")]
    public class PropertyChatConversation
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("property_id")]
        public int PropertyId { get; set; }

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [Column("property_title")]
        public string PropertyTitle { get; set; } = string.Empty;

        [Column("assigned_agent")]
        public string AssignedAgent { get; set; } = string.Empty;

        [Column("contact_name")]
        public string ContactName { get; set; } = string.Empty;

        [Column("contact_email")]
        public string ContactEmail { get; set; } = string.Empty;

        [Column("contact_phone")]
        public string ContactPhone { get; set; } = string.Empty;

        [Column("budget")]
        public string Budget { get; set; } = string.Empty;

        [Column("timeline")]
        public string Timeline { get; set; } = string.Empty;

        [Column("interest")]
        public string Interest { get; set; } = string.Empty;

        [Column("summary")]
        public string Summary { get; set; } = string.Empty;

        [Column("qualification_score")]
        public float QualificationScore { get; set; }

        [Column("auto_qualified")]
        public bool AutoQualified { get; set; }

        [Column("status")]
        public PropertyChatConversationStatus Status { get; set; } = PropertyChatConversationStatus.New;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property Property { get; set; } = null!;

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        public List<PropertyChatMessage> Messages { get; set; } = [];
    }

    [Table("property_chat_message")]
    public class PropertyChatMessage
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [Column("conversation_id")]
        public int ConversationId { get; set; }

        [Column("sender_role")]
        public PropertyChatSenderRole SenderRole { get; set; } = PropertyChatSenderRole.Visitor;

        [Required]
        [Column("message")]
        public string Message { get; set; } = string.Empty;

        [Column("attachment_url")]
        public string? AttachmentUrl { get; set; }

        [Column("attachment_object_name")]
        public string? AttachmentObjectName { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(ConversationId))]
        [JsonIgnore]
        public PropertyChatConversation Conversation { get; set; } = null!;
    }
}
