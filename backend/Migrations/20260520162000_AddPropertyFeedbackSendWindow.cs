using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddPropertyFeedbackSendWindow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE property_feedback_automation_settings ADD COLUMN IF NOT EXISTS feedback_request_send_window_start_hour_utc integer NULL;
                ALTER TABLE property_feedback_automation_settings ADD COLUMN IF NOT EXISTS feedback_request_send_window_end_hour_utc integer NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
