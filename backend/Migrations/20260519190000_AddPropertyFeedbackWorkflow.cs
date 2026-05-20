using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddPropertyFeedbackWorkflow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "feedback_received_at",
                table: "showing_booking",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "feedback_requested_at",
                table: "showing_booking",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_email",
                table: "showing_booking",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_name",
                table: "showing_booking",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_phone",
                table: "showing_booking",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_email",
                table: "lead",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_name",
                table: "lead",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "showing_agent_phone",
                table: "lead",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "property_feedback_automation_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    owner_report_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    owner_report_frequency = table.Column<int>(type: "integer", nullable: false),
                    owner_report_day_of_week = table.Column<int>(type: "integer", nullable: false),
                    owner_report_day_of_month = table.Column<int>(type: "integer", nullable: false),
                    owner_report_send_hour_utc = table.Column<int>(type: "integer", nullable: false),
                    owner_report_channels = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    owner_report_subject = table.Column<string>(type: "text", nullable: false),
                    owner_report_body = table.Column<string>(type: "text", nullable: false),
                    feedback_request_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    feedback_request_delay_hours = table.Column<int>(type: "integer", nullable: false),
                    feedback_request_follow_up_delay_hours = table.Column<int>(type: "integer", nullable: false),
                    feedback_request_max_follow_ups = table.Column<int>(type: "integer", nullable: false),
                    feedback_request_channels = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    feedback_request_subject = table.Column<string>(type: "text", nullable: false),
                    feedback_request_body = table.Column<string>(type: "text", nullable: false),
                    auto_capture_mail_feedback = table.Column<bool>(type: "boolean", nullable: false),
                    last_owner_report_run_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_feedback_automation_settings", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "property_owner_report_dispatch",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    period_start = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    period_end = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    channels = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    subject = table.Column<string>(type: "text", nullable: false),
                    body = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_owner_report_dispatch", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_owner_report_dispatch_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "showing_feedback_request",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    showing_booking_id = table.Column<int>(type: "integer", nullable: true),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    lead_id = table.Column<int>(type: "integer", nullable: true),
                    recipient_type = table.Column<int>(type: "integer", nullable: false),
                    recipient_name = table.Column<string>(type: "text", nullable: false),
                    recipient_email = table.Column<string>(type: "text", nullable: false),
                    recipient_phone = table.Column<string>(type: "text", nullable: false),
                    channels = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    subject = table.Column<string>(type: "text", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    scheduled_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    last_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_follow_up_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    follow_up_count = table.Column<int>(type: "integer", nullable: false),
                    max_follow_ups = table.Column<int>(type: "integer", nullable: false),
                    reply_received_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    reply_summary = table.Column<string>(type: "text", nullable: false),
                    skip_reason = table.Column<string>(type: "text", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_showing_feedback_request", x => x.id);
                    table.ForeignKey(
                        name: "FK_showing_feedback_request_lead_lead_id",
                        column: x => x.lead_id,
                        principalTable: "lead",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_showing_feedback_request_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_showing_feedback_request_showing_booking_showing_booking_id",
                        column: x => x.showing_booking_id,
                        principalTable: "showing_booking",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "property_visit_feedback",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    showing_booking_id = table.Column<int>(type: "integer", nullable: true),
                    lead_id = table.Column<int>(type: "integer", nullable: true),
                    feedback_request_id = table.Column<int>(type: "integer", nullable: true),
                    source = table.Column<int>(type: "integer", nullable: false),
                    contact_name = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "text", nullable: false),
                    contact_phone = table.Column<string>(type: "text", nullable: false),
                    feedback_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    sentiment = table.Column<int>(type: "integer", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    feedback_text = table.Column<string>(type: "text", nullable: false),
                    issues = table.Column<string>(type: "jsonb", nullable: false, defaultValue: "[]"),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_property_visit_feedback", x => x.id);
                    table.ForeignKey(
                        name: "FK_property_visit_feedback_lead_lead_id",
                        column: x => x.lead_id,
                        principalTable: "lead",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_property_visit_feedback_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_property_visit_feedback_showing_booking_showing_booking_id",
                        column: x => x.showing_booking_id,
                        principalTable: "showing_booking",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_property_visit_feedback_showing_feedback_request_feedback_request_id",
                        column: x => x.feedback_request_id,
                        principalTable: "showing_feedback_request",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_property_owner_report_dispatch_property_id",
                table: "property_owner_report_dispatch",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_visit_feedback_feedback_request_id",
                table: "property_visit_feedback",
                column: "feedback_request_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_visit_feedback_lead_id",
                table: "property_visit_feedback",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_visit_feedback_property_id",
                table: "property_visit_feedback",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_property_visit_feedback_showing_booking_id",
                table: "property_visit_feedback",
                column: "showing_booking_id");

            migrationBuilder.CreateIndex(
                name: "IX_showing_feedback_request_lead_id",
                table: "showing_feedback_request",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "IX_showing_feedback_request_property_id",
                table: "showing_feedback_request",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_showing_feedback_request_showing_booking_id",
                table: "showing_feedback_request",
                column: "showing_booking_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "property_feedback_automation_settings");
            migrationBuilder.DropTable(name: "property_owner_report_dispatch");
            migrationBuilder.DropTable(name: "property_visit_feedback");
            migrationBuilder.DropTable(name: "showing_feedback_request");

            migrationBuilder.DropColumn(name: "feedback_received_at", table: "showing_booking");
            migrationBuilder.DropColumn(name: "feedback_requested_at", table: "showing_booking");
            migrationBuilder.DropColumn(name: "showing_agent_email", table: "showing_booking");
            migrationBuilder.DropColumn(name: "showing_agent_name", table: "showing_booking");
            migrationBuilder.DropColumn(name: "showing_agent_phone", table: "showing_booking");
            migrationBuilder.DropColumn(name: "showing_agent_email", table: "lead");
            migrationBuilder.DropColumn(name: "showing_agent_name", table: "lead");
            migrationBuilder.DropColumn(name: "showing_agent_phone", table: "lead");
        }
    }
}
