using Microsoft.EntityFrameworkCore;


public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    // add new DbSet here when new entity added

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ✅ This ONE line auto-discovers ALL configuration files forever
        // No need to touch this ever again
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
