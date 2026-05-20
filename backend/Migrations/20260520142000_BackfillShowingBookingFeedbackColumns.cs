using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class BackfillShowingBookingFeedbackColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE showing_booking ADD COLUMN IF NOT EXISTS feedback_requested_at timestamp with time zone;
                ALTER TABLE showing_booking ADD COLUMN IF NOT EXISTS feedback_received_at timestamp with time zone;
                ALTER TABLE showing_booking ADD COLUMN IF NOT EXISTS showing_agent_name text NOT NULL DEFAULT '';
                ALTER TABLE showing_booking ADD COLUMN IF NOT EXISTS showing_agent_email text NOT NULL DEFAULT '';
                ALTER TABLE showing_booking ADD COLUMN IF NOT EXISTS showing_agent_phone text NOT NULL DEFAULT '';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
