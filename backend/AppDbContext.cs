using Microsoft.EntityFrameworkCore;
using Entities;
using Data;
namespace Data
{
      public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
      {
            public DbSet<User> Users => Set<User>();
            public DbSet<Property> Properties => Set<Property>();
            public DbSet<PropertyPreQuestion> PropertyPreQuestions => Set<PropertyPreQuestion>();
            public DbSet<PropertyChatConversation> PropertyChatConversations => Set<PropertyChatConversation>();
            public DbSet<PropertyChatMessage> PropertyChatMessages => Set<PropertyChatMessage>();
            public DbSet<NeighborhoodInsight> NeighborhoodInsights => Set<NeighborhoodInsight>();
            public DbSet<Lead> Leads => Set<Lead>();
            public DbSet<DealPipeline> DealPipelines => Set<DealPipeline>();
            public DbSet<ContactRequest> ContactRequests => Set<ContactRequest>();
            public DbSet<MailInboxItem> MailInbox => Set<MailInboxItem>();
            public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
            public DbSet<DocumentRepositoryItem> DocumentRepositoryItems => Set<DocumentRepositoryItem>();
            public DbSet<HomePageSettingsRecord> HomePageSettings => Set<HomePageSettingsRecord>();
            public DbSet<MarketingSettingsRecord> MarketingSettings => Set<MarketingSettingsRecord>();
            public DbSet<AgencySettingsRecord> AgencySettings => Set<AgencySettingsRecord>();
            public DbSet<AgencyIntegrationSettingsRecord> AgencyIntegrationSettings => Set<AgencyIntegrationSettingsRecord>();

            // add new DbSet here when new entity added

            protected override void OnModelCreating(ModelBuilder modelBuilder)
            {
                  // ✅ This ONE line auto-discovers ALL configuration files forever
                  // No need to touch this ever again
                  modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

                  modelBuilder.Entity<User>(entity =>
                 {
                       entity.Property(u => u.AgentRoutePermissions)
                        .HasColumnType("text[]")
                        .HasDefaultValueSql("'{}'");
                 });

                  modelBuilder.Entity<Property>()
            .HasOne(p => p.Agent)
            .WithMany(u => u.Properties)
            .HasForeignKey(p => p.AgentId)
            .OnDelete(DeleteBehavior.SetNull);
                  modelBuilder.Entity<Property>()
            .HasMany(item => item.PreQuestions)
            .WithOne(item => item.Property)
            .HasForeignKey(item => item.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);
                  modelBuilder.Entity<Property>()
            .HasMany(item => item.ChatConversations)
            .WithOne(item => item.Property)
            .HasForeignKey(item => item.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);
                  modelBuilder.Entity<DealPipeline>()
            .HasOne(item => item.SourceLead)
            .WithMany(lead => lead.Deals)
            .HasForeignKey(item => item.SourceLeadId)
            .OnDelete(DeleteBehavior.SetNull);
                  modelBuilder.Entity<PropertyChatConversation>()
            .HasOne(item => item.Lead)
            .WithMany()
            .HasForeignKey(item => item.LeadId)
            .OnDelete(DeleteBehavior.SetNull);
                  modelBuilder.Entity<PropertyChatConversation>()
            .HasMany(item => item.Messages)
            .WithOne(item => item.Conversation)
            .HasForeignKey(item => item.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
                  modelBuilder.Entity<ContactRequest>()
            .HasOne(item => item.Lead)
            .WithMany(lead => lead.ContactRequests)
            .HasForeignKey(item => item.LeadId)
            .OnDelete(DeleteBehavior.SetNull);
                  modelBuilder.Entity<MailInboxItem>()
            .HasOne(item => item.Lead)
            .WithMany(lead => lead.MailInboxItems)
            .HasForeignKey(item => item.LeadId)
            .OnDelete(DeleteBehavior.SetNull);
            }
      }
}
