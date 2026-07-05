using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services;

public sealed class PropertyOperationsPublicService(AppDbContext db)
{
    public async Task<PropertyOperationsSettingsRecord> GetSettingsAsync(CancellationToken ct = default)
    {
        var settings = await db.PropertyOperationsSettings.FirstOrDefaultAsync(item => item.Id == 1, ct);
        if (settings is not null) return settings;

        settings = new PropertyOperationsSettingsRecord { Id = 1 };
        db.PropertyOperationsSettings.Add(settings);
        await db.SaveChangesAsync(ct);
        return settings;
    }

    public async Task<PropertyOperationsSettingsRecord> UpdateSettingsAsync(UpdatePropertyOperationsSettingsRequest req, CancellationToken ct = default)
    {
        var settings = await GetSettingsAsync(ct);
        settings.BusinessName = Text(req.BusinessName, "Property Operations", 200);
        settings.LogoUrl = Text(req.LogoUrl, string.Empty, 1000);
        settings.BrandColor = Text(req.BrandColor, "#111827", 20);
        settings.PublicBaseUrl = Text(req.PublicBaseUrl, string.Empty, 1000).TrimEnd('/');
        settings.DefaultExpiryHours = Math.Clamp(req.DefaultExpiryHours, 1, 8760);
        settings.DefaultMaxUses = Math.Clamp(req.DefaultMaxUses, 1, 1000);
        settings.DefaultOneTime = req.DefaultOneTime;
        settings.RequireName = req.RequireName;
        settings.RequireEmail = req.RequireEmail;
        settings.RequirePhone = req.RequirePhone;
        settings.AllowFileUploads = req.AllowFileUploads;
        settings.ShowPropertyAddress = req.ShowPropertyAddress;
        settings.AutoCloseRecordOnSubmit = req.AutoCloseRecordOnSubmit;
        settings.NotifyAdminOnSubmit = req.NotifyAdminOnSubmit;
        settings.WelcomeMessage = Text(req.WelcomeMessage, string.Empty, 5000);
        settings.TermsText = Text(req.TermsText, string.Empty, 10000);
        settings.EmailSubjectTemplate = Text(req.EmailSubjectTemplate, string.Empty, 1000);
        settings.EmailBodyTemplate = Text(req.EmailBodyTemplate, string.Empty, 10000);
        settings.SmsTemplate = Text(req.SmsTemplate, string.Empty, 2000);
        settings.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await AddActivityAsync(null, "organization", "settings-updated", "Settings", 1, "Admin", "Property Operations settings updated.", "{}", ct);
        return settings;
    }

    public async Task<(PropertyOperationsPublicAccess Item, string Token, string Url)> CreateAccessAsync(CreatePropertyOperationsPublicAccessRequest req, CancellationToken ct = default)
    {
        var workspace = await db.PropertyOperationsWorkspaces
            .Include(item => item.Property)
            .FirstOrDefaultAsync(item => item.PropertyId == req.PropertyId, ct)
            ?? throw new ArgumentException("Import the property before creating a public request.");

        var settings = await GetSettingsAsync(ct);
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)).ToLowerInvariant();
        var item = new PropertyOperationsPublicAccess
        {
            WorkspaceId = workspace.Id,
            RecordId = req.RecordId,
            ModuleKey = Text(req.ModuleKey, "portfolio", 80).ToLowerInvariant(),
            Title = Text(req.Title, "Property request", 240),
            Instructions = Text(req.Instructions, string.Empty, 10000),
            RecipientLabel = Text(req.RecipientLabel, "External recipient", 120),
            RecipientName = Text(req.RecipientName, string.Empty, 160),
            RecipientEmail = Text(req.RecipientEmail, string.Empty, 240).ToLowerInvariant(),
            RecipientPhone = Text(req.RecipientPhone, string.Empty, 80),
            TokenHash = HashToken(token),
            FormSchemaJson = Json(req.FormSchemaJson, "[]"),
            ExpiresAt = DateTime.UtcNow.AddHours(Math.Clamp(req.ExpiryHours ?? settings.DefaultExpiryHours, 1, 8760)),
            MaxUses = Math.Clamp(req.MaxUses ?? settings.DefaultMaxUses, 1, 1000),
            OneTime = req.OneTime ?? settings.DefaultOneTime,
            AllowFileUploads = req.AllowFileUploads ?? settings.AllowFileUploads,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.PropertyOperationsPublicAccessLinks.Add(item);
        await db.SaveChangesAsync(ct);
        var baseUrl = string.IsNullOrWhiteSpace(settings.PublicBaseUrl) ? string.Empty : settings.PublicBaseUrl;
        var url = $"{baseUrl}/property-request/{token}";
        await AddActivityAsync(workspace.Id, item.ModuleKey, "public-link-created", "PublicAccess", item.Id, "Admin", $"Public request created for {item.RecipientLabel}.", "{}", ct);
        return (item, token, url);
    }

    public async Task<List<PropertyOperationsPublicAccess>> GetAccessLinksAsync(int? propertyId, CancellationToken ct = default)
    {
        var query = db.PropertyOperationsPublicAccessLinks
            .AsNoTracking()
            .Include(item => item.Workspace).ThenInclude(item => item.Property)
            .Include(item => item.Submissions)
            .AsQueryable();
        if (propertyId.HasValue) query = query.Where(item => item.Workspace.PropertyId == propertyId.Value);
        return await query.OrderByDescending(item => item.CreatedAt).ToListAsync(ct);
    }

    public async Task<List<PropertyOperationsPublicSubmission>> GetSubmissionsAsync(int accessId, CancellationToken ct = default) =>
        await db.PropertyOperationsPublicSubmissions.AsNoTracking().Where(item => item.PublicAccessId == accessId).OrderByDescending(item => item.SubmittedAt).ToListAsync(ct);

    public async Task RevokeAsync(int id, CancellationToken ct = default)
    {
        var item = await db.PropertyOperationsPublicAccessLinks.FirstOrDefaultAsync(link => link.Id == id, ct);
        if (item is null) return;
        item.Status = "Revoked";
        item.RevokedAt = DateTime.UtcNow;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await AddActivityAsync(item.WorkspaceId, item.ModuleKey, "public-link-revoked", "PublicAccess", item.Id, "Admin", "Public request link revoked.", "{}", ct);
    }

    public async Task<(PropertyOperationsPublicAccess Access, PropertyOperationsSettingsRecord Settings)> GetPublicAsync(string token, CancellationToken ct = default)
    {
        var access = await FindActiveAsync(token, false, ct);
        access.LastAccessedAt = DateTime.UtcNow;
        access.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return (access, await GetSettingsAsync(ct));
    }

    public async Task<PropertyOperationsPublicSubmission> SubmitAsync(string token, SubmitPropertyOperationsPublicRequest req, CancellationToken ct = default)
    {
        var access = await FindActiveAsync(token, true, ct);
        var settings = await GetSettingsAsync(ct);
        if (settings.RequireName && string.IsNullOrWhiteSpace(req.ResponderName)) throw new ArgumentException("Name is required.");
        if (settings.RequireEmail && string.IsNullOrWhiteSpace(req.ResponderEmail)) throw new ArgumentException("Email is required.");
        if (settings.RequirePhone && string.IsNullOrWhiteSpace(req.ResponderPhone)) throw new ArgumentException("Phone is required.");

        var submission = new PropertyOperationsPublicSubmission
        {
            PublicAccessId = access.Id,
            ResponderName = Text(req.ResponderName, string.Empty, 160),
            ResponderEmail = Text(req.ResponderEmail, string.Empty, 240).ToLowerInvariant(),
            ResponderPhone = Text(req.ResponderPhone, string.Empty, 80),
            Notes = Text(req.Notes, string.Empty, 10000),
            ResponseJson = Json(req.ResponseJson, "{}"),
            AttachmentUrlsJson = Json(req.AttachmentUrlsJson, "[]"),
            SubmittedAt = DateTime.UtcNow,
        };
        db.PropertyOperationsPublicSubmissions.Add(submission);
        access.UseCount += 1;
        access.LastAccessedAt = DateTime.UtcNow;
        access.UpdatedAt = DateTime.UtcNow;
        if (access.OneTime || access.UseCount >= access.MaxUses)
        {
            access.Status = "Completed";
            access.CompletedAt = DateTime.UtcNow;
        }
        if (settings.AutoCloseRecordOnSubmit && access.RecordId.HasValue)
        {
            var record = await db.PropertyOperationsRecords.FirstOrDefaultAsync(item => item.Id == access.RecordId.Value, ct);
            if (record is not null)
            {
                record.Status = "Completed";
                record.UpdatedAt = DateTime.UtcNow;
            }
        }
        await db.SaveChangesAsync(ct);
        await AddActivityAsync(access.WorkspaceId, access.ModuleKey, "anonymous-submission", "PublicSubmission", submission.Id, "External", $"Anonymous response submitted for {access.Title}.", submission.ResponseJson, ct);
        return submission;
    }

    public async Task<PropertyOperationsAnalyticsResponse> GetAnalyticsAsync(CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var records = db.PropertyOperationsRecords.AsNoTracking();
        var response = new PropertyOperationsAnalyticsResponse
        {
            ImportedProperties = await db.PropertyOperationsWorkspaces.CountAsync(ct),
            TotalRecords = await records.CountAsync(ct),
            OpenRecords = await records.CountAsync(item => item.Status != "Completed" && item.Status != "Closed" && item.Status != "Paid", ct),
            OverdueRecords = await records.CountAsync(item => item.DueAt < now && item.Status != "Completed" && item.Status != "Closed" && item.Status != "Paid", ct),
            CompletedRecords = await records.CountAsync(item => item.Status == "Completed" || item.Status == "Closed" || item.Status == "Paid", ct),
            ActivePublicLinks = await db.PropertyOperationsPublicAccessLinks.CountAsync(item => item.Status == "Active" && item.ExpiresAt > now, ct),
            CompletedPublicLinks = await db.PropertyOperationsPublicAccessLinks.CountAsync(item => item.Status == "Completed", ct),
            AnonymousSubmissions = await db.PropertyOperationsPublicSubmissions.CountAsync(ct),
            TotalIncome = await records.Where(item => item.ModuleKey == "finance" && item.RecordType.ToLower().Contains("income")).SumAsync(item => item.Amount ?? 0, ct),
            TotalExpense = await records.Where(item => item.ModuleKey == "finance" && item.RecordType.ToLower().Contains("expense")).SumAsync(item => item.Amount ?? 0, ct),
            RecordsByModule = await records.GroupBy(item => item.ModuleKey).ToDictionaryAsync(group => group.Key, group => group.Count(), ct),
            RecordsByStatus = await records.GroupBy(item => item.Status).ToDictionaryAsync(group => group.Key, group => group.Count(), ct),
        };
        return response;
    }

    public async Task<List<PropertyOperationsActivityResponse>> GetActivitiesAsync(int? propertyId, CancellationToken ct = default)
    {
        var query = db.PropertyOperationsActivities.AsNoTracking().AsQueryable();
        if (propertyId.HasValue)
        {
            var workspaceId = await db.PropertyOperationsWorkspaces.Where(item => item.PropertyId == propertyId.Value).Select(item => (int?)item.Id).FirstOrDefaultAsync(ct);
            query = query.Where(item => item.WorkspaceId == workspaceId);
        }
        return await query.OrderByDescending(item => item.CreatedAt).Take(250).Select(item => new PropertyOperationsActivityResponse
        {
            Id = item.Id,
            ModuleKey = item.ModuleKey,
            Action = item.Action,
            EntityType = item.EntityType,
            EntityId = item.EntityId,
            ActorType = item.ActorType,
            Summary = item.Summary,
            MetadataJson = item.MetadataJson,
            CreatedAt = item.CreatedAt,
        }).ToListAsync(ct);
    }

    private async Task<PropertyOperationsPublicAccess> FindActiveAsync(string token, bool forSubmission, CancellationToken ct)
    {
        var hash = HashToken(token);
        var item = await db.PropertyOperationsPublicAccessLinks
            .Include(access => access.Workspace).ThenInclude(workspace => workspace.Property)
            .FirstOrDefaultAsync(access => access.TokenHash == hash, ct)
            ?? throw new KeyNotFoundException("This request link is invalid.");
        if (item.Status == "Revoked") throw new InvalidOperationException("This request link was revoked.");
        if (item.ExpiresAt <= DateTime.UtcNow)
        {
            item.Status = "Expired";
            item.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            throw new InvalidOperationException("This request link has expired.");
        }
        if (item.Status == "Completed" || item.UseCount >= item.MaxUses) throw new InvalidOperationException("This request has already been completed.");
        if (forSubmission && item.OneTime && item.UseCount > 0) throw new InvalidOperationException("This one-time request has already been used.");
        return item;
    }

    private async Task AddActivityAsync(int? workspaceId, string moduleKey, string action, string entityType, int? entityId, string actorType, string summary, string metadataJson, CancellationToken ct)
    {
        db.PropertyOperationsActivities.Add(new PropertyOperationsActivity
        {
            WorkspaceId = workspaceId,
            ModuleKey = moduleKey,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            ActorType = actorType,
            Summary = summary,
            MetadataJson = Json(metadataJson, "{}"),
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync(ct);
    }

    public static PropertyOperationsSettingsResponse Map(PropertyOperationsSettingsRecord item) => new()
    {
        BusinessName = item.BusinessName,
        LogoUrl = item.LogoUrl,
        BrandColor = item.BrandColor,
        PublicBaseUrl = item.PublicBaseUrl,
        DefaultExpiryHours = item.DefaultExpiryHours,
        DefaultMaxUses = item.DefaultMaxUses,
        DefaultOneTime = item.DefaultOneTime,
        RequireName = item.RequireName,
        RequireEmail = item.RequireEmail,
        RequirePhone = item.RequirePhone,
        AllowFileUploads = item.AllowFileUploads,
        ShowPropertyAddress = item.ShowPropertyAddress,
        AutoCloseRecordOnSubmit = item.AutoCloseRecordOnSubmit,
        NotifyAdminOnSubmit = item.NotifyAdminOnSubmit,
        WelcomeMessage = item.WelcomeMessage,
        TermsText = item.TermsText,
        EmailSubjectTemplate = item.EmailSubjectTemplate,
        EmailBodyTemplate = item.EmailBodyTemplate,
        SmsTemplate = item.SmsTemplate,
        UpdatedAt = item.UpdatedAt,
    };

    public static PropertyOperationsPublicAccessResponse Map(PropertyOperationsPublicAccess item, string? token = null, string? url = null) => new()
    {
        Id = item.Id,
        PropertyId = item.Workspace.PropertyId,
        RecordId = item.RecordId,
        ModuleKey = item.ModuleKey,
        Title = item.Title,
        Instructions = item.Instructions,
        RecipientLabel = item.RecipientLabel,
        RecipientName = item.RecipientName,
        RecipientEmail = item.RecipientEmail,
        RecipientPhone = item.RecipientPhone,
        Status = item.Status,
        FormSchemaJson = item.FormSchemaJson,
        ExpiresAt = item.ExpiresAt,
        MaxUses = item.MaxUses,
        UseCount = item.UseCount,
        OneTime = item.OneTime,
        AllowFileUploads = item.AllowFileUploads,
        CreatedAt = item.CreatedAt,
        LastAccessedAt = item.LastAccessedAt,
        CompletedAt = item.CompletedAt,
        PropertyTitle = item.Workspace.Property.Title,
        PropertyLocation = item.Workspace.Property.ExactLocation ?? item.Workspace.Property.Location ?? string.Empty,
        PublicUrl = url,
        AccessToken = token,
        SubmissionCount = item.Submissions.Count,
    };

    private static string HashToken(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))).ToLowerInvariant();
    private static string Text(string? value, string fallback, int max) { var text = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim(); return text.Length <= max ? text : text[..max]; }
    private static string Json(string? value, string fallback) { var text = string.IsNullOrWhiteSpace(value) ? fallback : value; JsonDocument.Parse(text).Dispose(); return text; }
}
