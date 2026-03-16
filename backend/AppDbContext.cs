using Microsoft.EntityFrameworkCore;
using Entities;
using Data;
namespace Data
{
    public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
    {
        public DbSet<User> Users => Set<User>();
        public DbSet<Property> Properties => Set<Property>();
        public DbSet<NeighborhoodInsight> NeighborhoodInsights => Set<NeighborhoodInsight>();
        // add new DbSet here when new entity added

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // ✅ This ONE line auto-discovers ALL configuration files forever
            // No need to touch this ever again
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        }
    }
}