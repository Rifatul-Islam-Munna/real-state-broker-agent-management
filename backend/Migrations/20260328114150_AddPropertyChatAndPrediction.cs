using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class AddPropertyChatAndPrediction : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "closed_at",
                table: "property",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "property_chat_conversation",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    lead_id = table.Column<int>(type: "integer", nullable: true),
                    property_title = table.Column<string>(type: "text", nullable: false),
                    assigned_agent = table.Column<string>(type: "text", nullable: false),
                    contact_name = table.Column<string>(type: "text", nullable: false),
                    contact_email = table.Column<string>(type: "text", nullable: false),
                    contact_phone = table.Column<string>(type: "text", nullable: false),
                    budget = table.Column<string>(type: "text", nullable: false),
                    timeline = table.Column<string>(type: "text", nullable: false),
                    interest = table.Column<string>(type: "text", nullable: false),
                    summary = table.Column<string>(type: "text", nullable: false),
                    qualification_score = table.Column<float>(type: "real", nullable: false),
                    auto_qualified = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_property_chat_conversation", x => x.id);
                    table.ForeignKey(
                        name: "fk_property_chat_conversation_lead_lead_id",
                        column: x => x.lead_id,
                        principalTable: "lead",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_property_chat_conversation_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "property_pre_question",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    property_id = table.Column<int>(type: "integer", nullable: false),
                    prompt = table.Column<string>(type: "text", nullable: false),
                    helper_text = table.Column<string>(type: "text", nullable: false),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    allows_file_upload = table.Column<bool>(type: "boolean", nullable: false),
                    attachment_url = table.Column<string>(type: "text", nullable: true),
                    attachment_object_name = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_property_pre_question", x => x.id);
                    table.ForeignKey(
                        name: "fk_property_pre_question_property_property_id",
                        column: x => x.property_id,
                        principalTable: "property",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "property_chat_message",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    conversation_id = table.Column<int>(type: "integer", nullable: false),
                    sender_role = table.Column<int>(type: "integer", nullable: false),
                    message = table.Column<string>(type: "text", nullable: false),
                    attachment_url = table.Column<string>(type: "text", nullable: true),
                    attachment_object_name = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_property_chat_message", x => x.id);
                    table.ForeignKey(
                        name: "fk_property_chat_message_property_chat_conversation_conversati",
                        column: x => x.conversation_id,
                        principalTable: "property_chat_conversation",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_property_chat_conversation_lead_id",
                table: "property_chat_conversation",
                column: "lead_id");

            migrationBuilder.CreateIndex(
                name: "ix_property_chat_conversation_property_id",
                table: "property_chat_conversation",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "ix_property_chat_message_conversation_id",
                table: "property_chat_message",
                column: "conversation_id");

            migrationBuilder.CreateIndex(
                name: "ix_property_pre_question_property_id",
                table: "property_pre_question",
                column: "property_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "property_chat_message");

            migrationBuilder.DropTable(
                name: "property_pre_question");

            migrationBuilder.DropTable(
                name: "property_chat_conversation");

            migrationBuilder.DropColumn(
                name: "closed_at",
                table: "property");
        }
    }
}
