using Entities;
using Microsoft.EntityFrameworkCore;

namespace Data
{
    public partial class AppDbContext
    {
        public DbSet<PropertyOperationsWorkspace> PropertyOperationsWorkspaces => Set<PropertyOperationsWorkspace>();
        public DbSet<PropertyOperationsModuleState> PropertyOperationsModuleStates => Set<PropertyOperationsModuleState>();
        public DbSet<PropertyOperationsRecord> PropertyOperationsRecords => Set<PropertyOperationsRecord>();
        public DbSet<PropertyOperationsSettingsRecord> PropertyOperationsSettings => Set<PropertyOperationsSettingsRecord>();
        public DbSet<PropertyOperationsPublicAccess> PropertyOperationsPublicAccessLinks => Set<PropertyOperationsPublicAccess>();
        public DbSet<PropertyOperationsPublicSubmission> PropertyOperationsPublicSubmissions => Set<PropertyOperationsPublicSubmission>();
        public DbSet<PropertyOperationsActivity> PropertyOperationsActivities => Set<PropertyOperationsActivity>();
    }
}
