using Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("202607050001_AddPropertyOperationsWorkspace")]
    partial class AddPropertyOperationsWorkspace
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
        }
    }
}
