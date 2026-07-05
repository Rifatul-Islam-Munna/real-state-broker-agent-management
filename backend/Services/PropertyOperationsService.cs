using Data;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class PropertyOperationsService
    {
        public static readonly IReadOnlyList<string> ModuleKeys = new[]
        {
            "portfolio",
            "units",
            "tenants",
            "staff",
            "technicians",
            "vendors",
            "vendor-quotes",
            "tickets",
            "work-orders",
            "recurring-maintenance",
            "inspections",
            "assets",
            "billing",
            "finance",
            "subscriptions",
            "messages",
            "announcements",
            "notifications",
            "documents",
            "public-portals",
            "organization",
            "audit",
            "analytics",
            "ai",
        };

        private static readonly HashSet<string> SupportedModules = new(ModuleKeys, StringComparer.OrdinalIgnoreCase);
        private static readonly HashSet<string> SupportedModuleStatuses = new(
            new[] { "Not started", "In progress", "Ready" },
            StringComparer.OrdinalIgnoreCase);

        private readonly AppDbContext _db;

        public PropertyOperationsService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<List<PropertyOperationsWorkspace>> GetWorkspacesAsync(CancellationToken ct = default)
        {
            return await _db.PropertyOperationsWorkspaces
                .AsNoTracking()
                .Include(item => item.Property)
                .Include(item => item.ModuleStates)
                .OrderByDescending(item => item.UpdatedAt)
                .ToListAsync(ct);
        }

        public async Task<List<PropertyOperationsWorkspace>> ImportPropertiesAsync(
            IEnumerable<int> propertyIds,
            CancellationToken ct = default)
        {
            var normalizedIds = propertyIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (normalizedIds.Count == 0)
            {
                throw new ArgumentException("Select at least one property to import.");
            }

            var validPropertyIds = await _db.Properties
                .Where(property => normalizedIds.Contains(property.Id))
                .Select(property => property.Id)
                .ToListAsync(ct);

            if (validPropertyIds.Count != normalizedIds.Count)
            {
                throw new ArgumentException("One or more selected properties could not be found.");
            }

            var existingPropertyIds = await _db.PropertyOperationsWorkspaces
                .Where(workspace => validPropertyIds.Contains(workspace.PropertyId))
                .Select(workspace => workspace.PropertyId)
                .ToListAsync(ct);

            foreach (var propertyId in validPropertyIds.Except(existingPropertyIds))
            {
                var workspace = new PropertyOperationsWorkspace
                {
                    PropertyId = propertyId,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ModuleStates = ModuleKeys
                        .Select(moduleKey => new PropertyOperationsModuleState
                        {
                            ModuleKey = moduleKey,
                            Status = "Not started",
                            UpdatedAt = DateTime.UtcNow,
                        })
                        .ToList(),
                };

                await _db.PropertyOperationsWorkspaces.AddAsync(workspace, ct);
            }

            await _db.SaveChangesAsync(ct);
            return await GetWorkspacesAsync(ct);
        }

        public async Task RemoveWorkspaceAsync(int propertyId, CancellationToken ct = default)
        {
            var workspace = await _db.PropertyOperationsWorkspaces
                .FirstOrDefaultAsync(item => item.PropertyId == propertyId, ct);

            if (workspace is null)
            {
                return;
            }

            _db.PropertyOperationsWorkspaces.Remove(workspace);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<PropertyOperationsModuleState> UpdateModuleStateAsync(
            int propertyId,
            string moduleKey,
            string status,
            string? notes,
            CancellationToken ct = default)
        {
            var normalizedModuleKey = NormalizeModuleKey(moduleKey);
            var normalizedStatus = NormalizeModuleStatus(status);

            var workspace = await _db.PropertyOperationsWorkspaces
                .Include(item => item.ModuleStates)
                .FirstOrDefaultAsync(item => item.PropertyId == propertyId, ct)
                ?? throw new ArgumentException("Import the property before updating module state.");

            var state = workspace.ModuleStates
                .FirstOrDefault(item => item.ModuleKey.Equals(normalizedModuleKey, StringComparison.OrdinalIgnoreCase));

            if (state is null)
            {
                state = new PropertyOperationsModuleState
                {
                    WorkspaceId = workspace.Id,
                    ModuleKey = normalizedModuleKey,
                };
                await _db.PropertyOperationsModuleStates.AddAsync(state, ct);
            }

            state.Status = normalizedStatus;
            state.Notes = (notes ?? string.Empty).Trim();
            state.UpdatedAt = DateTime.UtcNow;
            workspace.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return state;
        }

        public async Task<List<PropertyOperationsRecord>> GetRecordsAsync(
            int propertyId,
            string? moduleKey,
            CancellationToken ct = default)
        {
            var workspaceId = await _db.PropertyOperationsWorkspaces
                .Where(item => item.PropertyId == propertyId)
                .Select(item => (int?)item.Id)
                .FirstOrDefaultAsync(ct)
                ?? throw new ArgumentException("Import the property before loading operational records.");

            var query = _db.PropertyOperationsRecords
                .AsNoTracking()
                .Where(item => item.WorkspaceId == workspaceId);

            if (!string.IsNullOrWhiteSpace(moduleKey))
            {
                var normalizedModuleKey = NormalizeModuleKey(moduleKey);
                query = query.Where(item => item.ModuleKey == normalizedModuleKey);
            }

            return await query
                .OrderBy(item => item.Status == "Closed" || item.Status == "Completed")
                .ThenBy(item => item.DueAt)
                .ThenByDescending(item => item.UpdatedAt)
                .ToListAsync(ct);
        }

        public async Task<PropertyOperationsRecord> SaveRecordAsync(
            int? id,
            int propertyId,
            string moduleKey,
            string recordType,
            string title,
            string? description,
            string? status,
            string? priority,
            string? contactName,
            string? contactEmail,
            string? contactPhone,
            decimal? amount,
            DateTime? dueAt,
            string? payloadJson,
            CancellationToken ct = default)
        {
            var normalizedModuleKey = NormalizeModuleKey(moduleKey);
            var workspace = await _db.PropertyOperationsWorkspaces
                .FirstOrDefaultAsync(item => item.PropertyId == propertyId, ct)
                ?? throw new ArgumentException("Import the property before saving operational records.");

            PropertyOperationsRecord record;
            if (id.HasValue && id.Value > 0)
            {
                record = await _db.PropertyOperationsRecords
                    .FirstOrDefaultAsync(item => item.Id == id.Value && item.WorkspaceId == workspace.Id, ct)
                    ?? throw new KeyNotFoundException("Operational record was not found.");
            }
            else
            {
                record = new PropertyOperationsRecord
                {
                    WorkspaceId = workspace.Id,
                    CreatedAt = DateTime.UtcNow,
                };
                await _db.PropertyOperationsRecords.AddAsync(record, ct);
            }

            record.ModuleKey = normalizedModuleKey;
            record.RecordType = NormalizeText(recordType, "Item", 80);
            record.Title = NormalizeText(title, "Untitled item", 240);
            record.Description = (description ?? string.Empty).Trim();
            record.Status = NormalizeText(status, "Open", 60);
            record.Priority = NormalizeText(priority, "Normal", 40);
            record.ContactName = NormalizeText(contactName, string.Empty, 160);
            record.ContactEmail = NormalizeText(contactEmail, string.Empty, 240).ToLowerInvariant();
            record.ContactPhone = NormalizeText(contactPhone, string.Empty, 80);
            record.Amount = amount;
            record.DueAt = dueAt?.ToUniversalTime();
            record.PayloadJson = NormalizeJson(payloadJson);
            record.UpdatedAt = DateTime.UtcNow;
            workspace.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return record;
        }

        public async Task DeleteRecordAsync(int id, CancellationToken ct = default)
        {
            var record = await _db.PropertyOperationsRecords.FirstOrDefaultAsync(item => item.Id == id, ct);
            if (record is null)
            {
                return;
            }

            _db.PropertyOperationsRecords.Remove(record);
            await _db.SaveChangesAsync(ct);
        }

        private static string NormalizeModuleKey(string value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            if (!SupportedModules.Contains(normalized))
            {
                throw new ArgumentException($"Unsupported property operations module: {value}");
            }

            return normalized;
        }

        private static string NormalizeModuleStatus(string value)
        {
            var normalized = (value ?? string.Empty).Trim();
            if (!SupportedModuleStatuses.Contains(normalized))
            {
                throw new ArgumentException("Module status must be Not started, In progress, or Ready.");
            }

            return SupportedModuleStatuses.First(item => item.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        }

        private static string NormalizeText(string? value, string fallback, int maxLength)
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
            return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
        }

        private static string NormalizeJson(string? value)
        {
            var normalized = string.IsNullOrWhiteSpace(value) ? "{}" : value.Trim();
            try
            {
                System.Text.Json.JsonDocument.Parse(normalized).Dispose();
                return normalized;
            }
            catch (System.Text.Json.JsonException)
            {
                throw new ArgumentException("PayloadJson must contain valid JSON.");
            }
        }
    }
}
