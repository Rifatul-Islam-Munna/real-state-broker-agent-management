using Entities;

namespace Models
{
    public static class PropertyOperationsResponseMapper
    {
        public static PropertyOperationsWorkspaceResponse ToResponse(PropertyOperationsWorkspace workspace)
        {
            return new PropertyOperationsWorkspaceResponse
            {
                Id = workspace.Id,
                PropertyId = workspace.PropertyId,
                Status = workspace.Status,
                PropertyTitle = workspace.Property?.Title ?? "Untitled property",
                PropertyLocation = workspace.Property?.ExactLocation ?? workspace.Property?.Location ?? string.Empty,
                PropertyType = workspace.Property?.PropertyType.ToString() ?? string.Empty,
                ListingType = workspace.Property?.ListingType.ToString() ?? string.Empty,
                PropertyStatus = workspace.Property?.Status.ToString() ?? string.Empty,
                PropertySlug = workspace.Property?.Slug ?? string.Empty,
                ThumbnailUrl = workspace.Property?.ThumbnailUrl ?? string.Empty,
                CreatedAt = workspace.CreatedAt,
                UpdatedAt = workspace.UpdatedAt,
                ModuleStates = workspace.ModuleStates
                    .OrderBy(item => item.ModuleKey)
                    .Select(item => new PropertyOperationsModuleStateResponse
                    {
                        Id = item.Id,
                        ModuleKey = item.ModuleKey,
                        Status = item.Status,
                        Notes = item.Notes,
                        UpdatedAt = item.UpdatedAt,
                    })
                    .ToList(),
            };
        }

        public static PropertyOperationsRecordResponse ToResponse(PropertyOperationsRecord record, int propertyId)
        {
            return new PropertyOperationsRecordResponse
            {
                Id = record.Id,
                PropertyId = propertyId,
                ModuleKey = record.ModuleKey,
                RecordType = record.RecordType,
                Title = record.Title,
                Description = record.Description,
                Status = record.Status,
                Priority = record.Priority,
                Amount = record.Amount,
                DueAt = record.DueAt,
                PayloadJson = record.PayloadJson,
                CreatedAt = record.CreatedAt,
                UpdatedAt = record.UpdatedAt,
            };
        }
    }
}
