using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    public partial class AddPropertyOwnerFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "owner_address",
                table: "property",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "owner_company",
                table: "property",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "owner_email",
                table: "property",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "owner_name",
                table: "property",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "owner_notes",
                table: "property",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "owner_phone",
                table: "property",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "owner_address", table: "property");
            migrationBuilder.DropColumn(name: "owner_company", table: "property");
            migrationBuilder.DropColumn(name: "owner_email", table: "property");
            migrationBuilder.DropColumn(name: "owner_name", table: "property");
            migrationBuilder.DropColumn(name: "owner_notes", table: "property");
            migrationBuilder.DropColumn(name: "owner_phone", table: "property");
        }
    }
}
