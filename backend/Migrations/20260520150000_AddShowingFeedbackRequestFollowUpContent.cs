using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddShowingFeedbackRequestFollowUpContent : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE showing_feedback_request ADD COLUMN IF NOT EXISTS follow_up_subject text NOT NULL DEFAULT '';
                ALTER TABLE showing_feedback_request ADD COLUMN IF NOT EXISTS follow_up_message text NOT NULL DEFAULT '';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
