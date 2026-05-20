using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddPropertyInternalDetailsMarkdown : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE property
                ADD COLUMN IF NOT EXISTS internal_details_markdown text;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE property
                DROP COLUMN IF EXISTS internal_details_markdown;
                """);
        }
    }
}
