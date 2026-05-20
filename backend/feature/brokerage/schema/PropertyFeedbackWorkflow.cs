using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Services;

namespace Entities
{
    public enum FeedbackAutomationFrequency
    {
        Weekly,
        Monthly
    }

    public enum ShowingFeedbackRequestRecipientType
    {
        Visitor,
        ShowingAgent
    }

    public enum ShowingFeedbackRequestStatus
    {
        Pending,
        Sent,
        Replied,
        Skipped,
        Failed
    }

    public enum PropertyFeedbackSentiment
    {
        Unknown,
        Positive,
        Mixed,
        Negative
    }

    public enum PropertyVisitFeedbackSource
    {
        MailboxAi,
        ManualEntry,
        CsvImport,
        SmsReply
    }

    public enum PropertyOwnerReportDispatchStatus
    {
        Sent,
        Skipped,
        Failed
    }

    [Table("property_feedback_automation_settings")]
    public class PropertyFeedbackAutomationSettings
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; } = 1;

        [Column("owner_report_enabled")]
        public bool OwnerReportEnabled { get; set; } = true;

        [Column("owner_report_frequency")]
        public FeedbackAutomationFrequency OwnerReportFrequency { get; set; } = FeedbackAutomationFrequency.Weekly;

        [Column("owner_report_day_of_week")]
        public int OwnerReportDayOfWeek { get; set; } = 1;

        [Column("owner_report_day_of_month")]
        public int OwnerReportDayOfMonth { get; set; } = 1;

        [Column("owner_report_send_hour_utc")]
        public int OwnerReportSendHourUtc { get; set; } = 8;

        [Column("owner_report_channels", TypeName = "jsonb")]
        public List<AgencyCommunicationChannel> OwnerReportChannels { get; set; } = [AgencyCommunicationChannel.Email];

        [Column("owner_report_subject")]
        public string OwnerReportSubject { get; set; } = "Owner update for {{property_title}}";

        [Column("owner_report_body")]
        public string OwnerReportBody { get; set; } =
            "Hello {{owner_name}}, here is your {{report_frequency}} report for {{property_title}}.\n\n{{feedback_summary}}\n\n{{issue_list}}\n\n{{recommendation_summary}}";

        [Column("feedback_request_enabled")]
        public bool FeedbackRequestEnabled { get; set; } = true;

        [Column("feedback_request_delay_hours")]
        public int FeedbackRequestDelayHours { get; set; } = 2;

        [Column("feedback_request_follow_up_delay_hours")]
        public int FeedbackRequestFollowUpDelayHours { get; set; } = 24;

        [Column("feedback_request_max_follow_ups")]
        public int FeedbackRequestMaxFollowUps { get; set; } = 2;

        [Column("feedback_request_send_window_start_hour_utc")]
        public int? FeedbackRequestSendWindowStartHourUtc { get; set; }

        [Column("feedback_request_send_window_end_hour_utc")]
        public int? FeedbackRequestSendWindowEndHourUtc { get; set; }

        [Column("feedback_request_channels", TypeName = "jsonb")]
        public List<AgencyCommunicationChannel> FeedbackRequestChannels { get; set; } = [AgencyCommunicationChannel.Email, AgencyCommunicationChannel.SMS];

        [Column("feedback_request_subject")]
        public string FeedbackRequestSubject { get; set; } = "Showing feedback for {{property_title}}";

        [Column("feedback_request_body")]
        public string FeedbackRequestBody { get; set; } =
            "Hello {{recipient_name}}, please share visit feedback for {{property_title}} shown on {{showing_time}}. Reply with objections, price concerns, location issues, condition notes, and next-step readiness.";

        [Column("auto_capture_mail_feedback")]
        public bool AutoCaptureMailFeedback { get; set; } = true;

        [Column("last_owner_report_run_at")]
        public DateTime? LastOwnerReportRunAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("showing_feedback_request")]
    public class ShowingFeedbackRequest
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("showing_booking_id")]
        public int? ShowingBookingId { get; set; }

        [ForeignKey(nameof(ShowingBookingId))]
        [JsonIgnore]
        public ShowingBooking? ShowingBooking { get; set; }

        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property? Property { get; set; }

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Column("recipient_type")]
        public ShowingFeedbackRequestRecipientType RecipientType { get; set; } = ShowingFeedbackRequestRecipientType.ShowingAgent;

        [Column("recipient_name")]
        public string RecipientName { get; set; } = string.Empty;

        [Column("recipient_email")]
        public string RecipientEmail { get; set; } = string.Empty;

        [Column("recipient_phone")]
        public string RecipientPhone { get; set; } = string.Empty;

        [Column("channels", TypeName = "jsonb")]
        public List<AgencyCommunicationChannel> Channels { get; set; } = [];

        [Column("subject")]
        public string Subject { get; set; } = string.Empty;

        [Column("message")]
        public string Message { get; set; } = string.Empty;

        [Column("follow_up_subject")]
        public string FollowUpSubject { get; set; } = string.Empty;

        [Column("follow_up_message")]
        public string FollowUpMessage { get; set; } = string.Empty;

        [Column("status")]
        public ShowingFeedbackRequestStatus Status { get; set; } = ShowingFeedbackRequestStatus.Pending;

        [Column("scheduled_at")]
        public DateTime ScheduledAt { get; set; }

        [Column("last_sent_at")]
        public DateTime? LastSentAt { get; set; }

        [Column("next_follow_up_at")]
        public DateTime? NextFollowUpAt { get; set; }

        [Column("follow_up_count")]
        public int FollowUpCount { get; set; }

        [Column("max_follow_ups")]
        public int MaxFollowUps { get; set; } = 2;

        [Column("reply_received_at")]
        public DateTime? ReplyReceivedAt { get; set; }

        [Column("reply_summary")]
        public string ReplySummary { get; set; } = string.Empty;

        [Column("skip_reason")]
        public string SkipReason { get; set; } = string.Empty;

        [Column("created_by")]
        public string CreatedBy { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("property_visit_feedback")]
    public class PropertyVisitFeedback
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property? Property { get; set; }

        [Column("showing_booking_id")]
        public int? ShowingBookingId { get; set; }

        [ForeignKey(nameof(ShowingBookingId))]
        [JsonIgnore]
        public ShowingBooking? ShowingBooking { get; set; }

        [Column("lead_id")]
        public int? LeadId { get; set; }

        [ForeignKey(nameof(LeadId))]
        [JsonIgnore]
        public Lead? Lead { get; set; }

        [Column("feedback_request_id")]
        public int? FeedbackRequestId { get; set; }

        [ForeignKey(nameof(FeedbackRequestId))]
        [JsonIgnore]
        public ShowingFeedbackRequest? FeedbackRequest { get; set; }

        [Column("source")]
        public PropertyVisitFeedbackSource Source { get; set; } = PropertyVisitFeedbackSource.ManualEntry;

        [Column("contact_name")]
        public string ContactName { get; set; } = string.Empty;

        [Column("contact_email")]
        public string ContactEmail { get; set; } = string.Empty;

        [Column("contact_phone")]
        public string ContactPhone { get; set; } = string.Empty;

        [Column("feedback_at")]
        public DateTime FeedbackAt { get; set; } = DateTime.UtcNow;

        [Column("sentiment")]
        public PropertyFeedbackSentiment Sentiment { get; set; } = PropertyFeedbackSentiment.Unknown;

        [Column("summary")]
        public string Summary { get; set; } = string.Empty;

        [Column("feedback_text")]
        public string FeedbackText { get; set; } = string.Empty;

        [Column("issues", TypeName = "jsonb")]
        public List<string> Issues { get; set; } = [];

        [Column("created_by")]
        public string CreatedBy { get; set; } = string.Empty;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    [Table("property_owner_report_dispatch")]
    public class PropertyOwnerReportDispatch
    {
        [Key]
        [Column("id")]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Column("property_id")]
        public int PropertyId { get; set; }

        [ForeignKey(nameof(PropertyId))]
        [JsonIgnore]
        public Property? Property { get; set; }

        [Column("period_start")]
        public DateTime PeriodStart { get; set; }

        [Column("period_end")]
        public DateTime PeriodEnd { get; set; }

        [Column("channels", TypeName = "jsonb")]
        public List<AgencyCommunicationChannel> Channels { get; set; } = [];

        [Column("subject")]
        public string Subject { get; set; } = string.Empty;

        [Column("body")]
        public string Body { get; set; } = string.Empty;

        [Column("status")]
        public PropertyOwnerReportDispatchStatus Status { get; set; } = PropertyOwnerReportDispatchStatus.Sent;

        [Column("summary")]
        public string Summary { get; set; } = string.Empty;

        [Column("created_by")]
        public string CreatedBy { get; set; } = string.Empty;

        [Column("sent_at")]
        public DateTime? SentAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
