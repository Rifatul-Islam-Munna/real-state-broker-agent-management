using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAgentId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "document_repository_item_ids",
                table: "property",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "agent_id",
                table: "lead",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "follow_up_status",
                table: "lead",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "next_action_date",
                table: "lead",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "next_action_type",
                table: "lead",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "agent_id",
                table: "deal_pipeline",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "commission_amount",
                table: "deal_pipeline",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "commission_payout_note",
                table: "deal_pipeline",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "commission_status",
                table: "deal_pipeline",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "expected_closing_date",
                table: "deal_pipeline",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "brokerage_approval_request",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    type = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    old_price = table.Column<string>(type: "text", nullable: false),
                    requested_price = table.Column<string>(type: "text", nullable: false),
                    old_status = table.Column<int>(type: "integer", nullable: true),
                    requested_status = table.Column<int>(type: "integer", nullable: true),
                    requested_by = table.Column<string>(type: "text", nullable: false),
                    reviewed_by = table.Column<string>(type: "text", nullable: false),
                    request_note = table.Column<string>(type: "text", nullable: false),
                    review_note = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brokerage_approval_request", x => x.id);
                    table.ForeignKey(
                        name: "fk_brokerage_approval_request_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "brokerage_audit_log",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    entity_type = table.Column<string>(type: "text", nullable: false),
                    entity_id = table.Column<int>(type: "integer", nullable: true),
                    action = table.Column<string>(type: "text", nullable: false),
                    field_name = table.Column<string>(type: "text", nullable: false),
                    old_value = table.Column<string>(type: "text", nullable: false),
                    new_value = table.Column<string>(type: "text", nullable: false),
                    actor = table.Column<string>(type: "text", nullable: false),
                    note = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_brokerage_audit_log", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "deal_checklist_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    deal_pipeline_id = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_deal_checklist_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_deal_checklist_item_deal_pipeline_deal_pipeline_id",
                        column: x => x.deal_pipeline_id,
                        principalTable: "deal_pipeline",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lead_assignment_rule",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    area = table.Column<string>(type: "text", nullable: false),
                    property_type = table.Column<int>(type: "integer", nullable: true),
                    listing_type = table.Column<int>(type: "integer", nullable: true),
                    agent_id = table.Column<int>(type: "integer", nullable: false),
                    priority_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lead_assignment_rule", x => x.id);
                    table.ForeignKey(
                        name: "fk_lead_assignment_rule_users_agent_id",
                        column: x => x.agent_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "showing_booking",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    lead_id = table.Column<int>(type: "integer", nullable: true),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    agent_id = table.Column<int>(type: "integer", nullable: true),
                    contact_name = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "text", nullable: false),
                    contact_phone = table.Column<string>(type: "text", nullable: false),
                    start_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    notes = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_showing_booking", x => x.id);
                    table.ForeignKey(
                        name: "fk_showing_booking_lead_lead_id",
                        column: x => x.lead_id,
                        principalTable: "lead",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_showing_booking_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_showing_booking_users_agent_id",
                        column: x => x.agent_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_lead_agent_id",
                table: "lead",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "ix_deal_pipeline_agent_id",
                table: "deal_pipeline",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "ix_brokerage_approval_request_property_id",
                table: "brokerage_approval_request",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "ix_deal_checklist_item_deal_pipeline_id",
                table: "deal_checklist_item",
                column: "deal_pipeline_id");

            migrationBuilder.CreateIndex(
                name: "ix_lead_assignment_rule_agent_id",
                table: "lead_assignment_rule",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "ix_showing_booking_agent_id",
                table: "showing_booking",
                column: "agent_id");

            migrationBuilder.CreateIndex(
                name: "ix_showing_booking_lead_id",
                table: "showing_booking",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "ix_showing_booking_property_id",
                table: "showing_booking",
                column: "property_id");

            migrationBuilder.AddForeignKey(
                name: "fk_deal_pipeline_users_agent_id",
                table: "deal_pipeline",
                column: "agent_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "fk_lead_users_agent_id",
                table: "lead",
                column: "agent_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_deal_pipeline_users_agent_id",
                table: "deal_pipeline");

            migrationBuilder.DropForeignKey(
                name: "fk_lead_users_agent_id",
                table: "lead");

            migrationBuilder.DropTable(
                name: "brokerage_approval_request");

            migrationBuilder.DropTable(
                name: "brokerage_audit_log");

            migrationBuilder.DropTable(
                name: "deal_checklist_item");

            migrationBuilder.DropTable(
                name: "lead_assignment_rule");

            migrationBuilder.DropTable(
                name: "showing_booking");

            migrationBuilder.DropIndex(
                name: "ix_lead_agent_id",
                table: "lead");

            migrationBuilder.DropIndex(
                name: "ix_deal_pipeline_agent_id",
                table: "deal_pipeline");

            migrationBuilder.DropColumn(
                name: "document_repository_item_ids",
                table: "property");

            migrationBuilder.DropColumn(
                name: "agent_id",
                table: "lead");

            migrationBuilder.DropColumn(
                name: "follow_up_status",
                table: "lead");

            migrationBuilder.DropColumn(
                name: "next_action_date",
                table: "lead");

            migrationBuilder.DropColumn(
                name: "next_action_type",
                table: "lead");

            migrationBuilder.DropColumn(
                name: "agent_id",
                table: "deal_pipeline");

            migrationBuilder.DropColumn(
                name: "commission_amount",
                table: "deal_pipeline");

            migrationBuilder.DropColumn(
                name: "commission_payout_note",
                table: "deal_pipeline");

            migrationBuilder.DropColumn(
                name: "commission_status",
                table: "deal_pipeline");

            migrationBuilder.DropColumn(
                name: "expected_closing_date",
                table: "deal_pipeline");
        }
    }
}
