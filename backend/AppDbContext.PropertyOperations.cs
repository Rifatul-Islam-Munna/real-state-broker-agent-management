using Entities;
using Microsoft.EntityFrameworkCore;

namespace Data
{
    public partial class AppDbContext
    {
        public DbSet<PropertyOperationsWorkspace> PropertyOperationsWorkspaces => Set<PropertyOperationsWorkspace>();
        public DbSet<PropertyOperationsModuleState> PropertyOperationsModuleStates => Set<PropertyOperationsModuleState>();
        public DbSet<PropertyOperationsRecord> PropertyOperationsRecords => Set<PropertyOperationsRecord>();
    }
}
