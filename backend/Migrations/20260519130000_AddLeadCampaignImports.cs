using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    public partial class AddLeadCampaignImports : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lead_campaign_import_batch",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_name = table.Column<string>(type: "text", nullable: false),
                    template_name = table.Column<string>(type: "text", nullable: false),
                    initial_kinds = table.Column<List<int>>(type: "jsonb", nullable: false),
                    follow_up_kinds = table.Column<List<int>>(type: "jsonb", nullable: false),
                    csv_columns = table.Column<List<string>>(type: "jsonb", nullable: false),
                    lead_field_mappings = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: false),
                    variable_mappings = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: false),
                    total_rows = table.Column<int>(type: "integer", nullable: false),
                    imported_count = table.Column<int>(type: "integer", nullable: false),
                    sent_count = table.Column<int>(type: "integer", nullable: false),
                    scheduled_count = table.Column<int>(type: "integer", nullable: false),
                    skipped_count = table.Column<int>(type: "integer", nullable: false),
                    failed_count = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lead_campaign_import_batch", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "lead_campaign_import_item",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    batch_id = table.Column<int>(type: "integer", nullable: false),
                    row_number = table.Column<int>(type: "integer", nullable: false),
                    lead_id = table.Column<int>(type: "integer", nullable: true),
                    lead_name = table.Column<string>(type: "text", nullable: false),
                    lead_email = table.Column<string>(type: "text", nullable: false),
                    lead_phone = table.Column<string>(type: "text", nullable: false),
                    raw_data = table.Column<Dictionary<string, string>>(type: "jsonb", nullable: false),
                    rendered_initial_title = table.Column<string>(type: "text", nullable: false),
                    rendered_initial_message = table.Column<string>(type: "text", nullable: false),
                    rendered_follow_up_title = table.Column<string>(type: "text", nullable: false),
                    rendered_follow_up_message = table.Column<string>(type: "text", nullable: false),
                    initial_history_entry_id = table.Column<int>(type: "integer", nullable: true),
                    follow_up_history_entry_id = table.Column<int>(type: "integer", nullable: true),
                    initial_status = table.Column<int>(type: "integer", nullable: false),
                    follow_up_status = table.Column<int>(type: "integer", nullable: true),
                    skip_reason = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lead_campaign_import_item", x => x.id);
                    table.ForeignKey(
                        name: "fk_lead_campaign_import_item_lead_campaign_import_batch_batch_id",
                        column: x => x.batch_id,
                        principalTable: "lead_campaign_import_batch",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_lead_campaign_import_item_lead_lead_id",
                        column: x => x.lead_id,
                        principalTable: "lead",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "ix_lead_campaign_import_item_batch_id",
                table: "lead_campaign_import_item",
                column: "batch_id");

            migrationBuilder.CreateIndex(
                name: "ix_lead_campaign_import_item_lead_id",
                table: "lead_campaign_import_item",
                column: "lead_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lead_campaign_import_item");

            migrationBuilder.DropTable(
                name: "lead_campaign_import_batch");
        }
    }
}
