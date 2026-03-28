using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Models
{
    public class PaginatedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
        public bool HasNextPage => Page < TotalPages;
        public bool HasPreviousPage => Page > 1;
    }
}

namespace Services
{
    public record AgentSummary(
        int Id,
        string FullName,
        string? Phone,
        string? Email,
        string? AvatarUrl,
        string? AgencyName,
        bool IsVerifiedAgent
    );

    public record PropertyPreQuestionResponse(
        int Id,
        string Prompt,
        string HelperText,
        bool IsRequired,
        int SortOrder,
        bool AllowsFileUpload,
        string? AttachmentUrl,
        string? AttachmentObjectName
    );

    public record PropertyResponse(
        int Id,
        string Title,
        string Slug,
        PropertyCategory PropertyType,
        PropertyListingType ListingType,
        string Price,
        PropertyStatus Status,
        string Location,
        string ExactLocation,
        string BedRoom,
        string BathRoom,
        string Width,
        string Description,
        string? ThumbnailUrl,
        string? ThumbnailObjectName,
        List<string> ImageUrls,
        List<string> ImageObjectNames,
        List<string> KeyAmenities,
        List<NeighborhoodInsight> NeighborhoodInsights,
        List<PropertyPreQuestionResponse> PreQuestions,
        int? AgentId,
        AgentSummary? Agent,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        DateTime? ClosedAt,
        PropertySellPredictionResponse SellPrediction
    );

    public record PublicPropertyFiltersResponse(
        List<string> PropertyTypes,
        List<string> ListingTypes,
        List<string> Locations
    );

    public class PropertyService
    {
        private readonly AppDbContext _db;
        private readonly PropertySalesPredictionService _propertySalesPredictionService;

        public PropertyService(AppDbContext db, PropertySalesPredictionService propertySalesPredictionService)
        {
            _db = db;
            _propertySalesPredictionService = propertySalesPredictionService;
        }

        public async Task<PropertyResponse> CreatePropertyAsync(Property property)
        {
            NormalizeProperty(property, isNew: true);
            await _db.Properties.AddAsync(property);
            await _db.SaveChangesAsync();
            return await GetRequiredPropertyResponseAsync(property.Id);
        }

        public async Task<PropertyResponse?> UpdatePropertyAsync(Property property)
        {
            var existing = await _db.Properties
                .Include(item => item.NeighborhoodInsights)
                .Include(item => item.PreQuestions)
                .Include(item => item.Agent)
                .FirstOrDefaultAsync(item => item.Id == property.Id);

            if (existing is null)
            {
                return null;
            }

            existing.Title = property.Title ?? string.Empty;
            existing.PropertyType = property.PropertyType;
            existing.ListingType = property.ListingType;
            existing.Price = property.Price ?? string.Empty;
            existing.Status = property.Status;
            existing.Location = (property.Location ?? string.Empty).Trim();
            existing.ExactLocation = (property.ExactLocation ?? string.Empty).Trim();
            existing.BedRoom = (property.BedRoom ?? string.Empty).Trim();
            existing.BathRoom = (property.BathRoom ?? string.Empty).Trim();
            existing.Width = (property.Width ?? string.Empty).Trim();
            existing.Description = (property.Description ?? string.Empty).Trim();
            existing.ThumbnailUrl = NormalizeOptionalString(property.ThumbnailUrl);
            existing.ThumbnailObjectName = NormalizeOptionalString(property.ThumbnailObjectName);
            existing.ImageUrls = NormalizeStringList(property.ImageUrls);
            existing.ImageObjectNames = NormalizeStringList(property.ImageObjectNames);
            existing.KeyAmenities = NormalizeAmenities(property.KeyAmenities);
            existing.AgentId = property.AgentId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.ClosedAt = ResolveClosedAt(existing.ClosedAt, property.Status);

            _db.NeighborhoodInsights.RemoveRange(existing.NeighborhoodInsights);
            existing.NeighborhoodInsights = NormalizeNeighborhoodInsights(property.NeighborhoodInsights);

            _db.PropertyPreQuestions.RemoveRange(existing.PreQuestions);
            existing.PreQuestions = NormalizePreQuestions(property.PreQuestions);

            await _db.SaveChangesAsync();
            return await GetRequiredPropertyResponseAsync(existing.Id);
        }

        public async Task DeletePropertyAsync(int id)
        {
            var property = await _db.Properties
                .Include(item => item.NeighborhoodInsights)
                .Include(item => item.PreQuestions)
                .FirstOrDefaultAsync(item => item.Id == id);

            if (property is null)
            {
                return;
            }

            _db.NeighborhoodInsights.RemoveRange(property.NeighborhoodInsights);
            _db.PropertyPreQuestions.RemoveRange(property.PreQuestions);
            _db.Properties.Remove(property);
            await _db.SaveChangesAsync();
        }

        public async Task<PropertyResponse?> GetPropertyAsync(int id)
        {
            var property = await _db.Properties
                .Include(item => item.NeighborhoodInsights)
                .Include(item => item.PreQuestions)
                .Include(item => item.Agent)
                .FirstOrDefaultAsync(item => item.Id == id);

            return property is null
                ? null
                : await MapPropertyAsync(property);
        }

        public async Task<PropertyResponse?> GetPropertyBySlugAsync(string slug)
        {
            var property = await _db.Properties
                .Include(item => item.NeighborhoodInsights)
                .Include(item => item.PreQuestions)
                .Include(item => item.Agent)
                .FirstOrDefaultAsync(item => item.Slug == slug);

            return property is null
                ? null
                : await MapPropertyAsync(property);
        }

        public async Task<PaginatedResult<PropertyResponse>> GetAllPropertiesAsync(
            int page = 1,
            int pageSize = 10,
            string? search = null,
            PropertyCategory? propertyType = null,
            PropertyListingType? listingType = null,
            PropertyStatus? status = null,
            string? agent = null)
        {
            var query = _db.Properties
                .Include(item => item.NeighborhoodInsights)
                .Include(item => item.PreQuestions)
                .Include(item => item.Agent)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    (item.Title ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Location ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.ExactLocation ?? string.Empty).ToLower().Contains(normalizedSearch) ||
                    (item.Description ?? string.Empty).ToLower().Contains(normalizedSearch));
            }

            if (propertyType.HasValue)
            {
                query = query.Where(item => item.PropertyType == propertyType.Value);
            }

            if (listingType.HasValue)
            {
                query = query.Where(item => item.ListingType == listingType.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(item => item.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(agent))
            {
                var normalizedAgent = agent?.Trim().ToLower() ?? string.Empty;
                query = query.Where(item =>
                    item.Agent != null && (item.Agent.FullName ?? string.Empty).ToLower().Contains(normalizedAgent));
            }

            var totalCount = await query.CountAsync();
            var entities = await query
                .OrderByDescending(item => item.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var items = new List<PropertyResponse>(entities.Count);
            foreach (var entity in entities)
            {
                items.Add(await MapPropertyAsync(entity));
            }

            return new PaginatedResult<PropertyResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
            };
        }

        public async Task<PublicPropertyFiltersResponse> GetPublicPropertyFiltersAsync()
        {
            var openProperties = _db.Properties.Where(item => item.Status == PropertyStatus.Open);

            var propertyTypes = await openProperties
                .Select(item => item.PropertyType)
                .Distinct()
                .OrderBy(item => item)
                .ToListAsync();

            var listingTypes = await openProperties
                .Select(item => item.ListingType)
                .Distinct()
                .OrderBy(item => item)
                .ToListAsync();

            var locations = await openProperties
                .Where(item => !string.IsNullOrWhiteSpace(item.Location))
                .Select(item => item.Location.Trim())
                .Distinct()
                .OrderBy(item => item)
                .Take(12)
                .ToListAsync();

            return new PublicPropertyFiltersResponse(
                propertyTypes.Select(item => item.ToString()).ToList(),
                listingTypes.Select(item => item.ToString()).ToList(),
                locations
            );
        }

        private async Task<PropertyResponse> GetRequiredPropertyResponseAsync(int id)
        {
            return await GetPropertyAsync(id)
                ?? throw new InvalidOperationException("Property was not found after save.");
        }

        private async Task<PropertyResponse> MapPropertyAsync(Property item)
        {
            var prediction = await _propertySalesPredictionService.PredictAsync(item);

            return new PropertyResponse(
                item.Id,
                item.Title,
                item.Slug,
                item.PropertyType,
                item.ListingType,
                item.Price,
                item.Status,
                item.Location,
                item.ExactLocation,
                item.BedRoom,
                item.BathRoom,
                item.Width,
                item.Description,
                item.ThumbnailUrl,
                item.ThumbnailObjectName,
                item.ImageUrls,
                item.ImageObjectNames,
                item.KeyAmenities,
                item.NeighborhoodInsights
                    .Select(insight => new NeighborhoodInsight
                    {
                        Id = insight.Id,
                        Description = insight.Description,
                        PropertyId = insight.PropertyId,
                        Title = insight.Title,
                    })
                    .ToList(),
                item.PreQuestions
                    .OrderBy(question => question.SortOrder)
                    .ThenBy(question => question.Id)
                    .Select(question => new PropertyPreQuestionResponse(
                        question.Id,
                        question.Prompt,
                        question.HelperText,
                        question.IsRequired,
                        question.SortOrder,
                        question.AllowsFileUpload,
                        question.AttachmentUrl,
                        question.AttachmentObjectName))
                    .ToList(),
                item.AgentId,
                item.Agent == null ? null : new AgentSummary(
                    item.Agent.Id,
                    item.Agent.FullName,
                    item.Agent.Phone,
                    item.Agent.Email,
                    item.Agent.AvatarUrl,
                    item.Agent.AgencyName,
                    item.Agent.IsVerifiedAgent
                ),
                item.CreatedAt,
                item.UpdatedAt,
                item.ClosedAt,
                prediction
            );
        }

        private static void NormalizeProperty(Property property, bool isNew)
        {
            property.Title = (property.Title ?? string.Empty).Trim();
            property.Price = (property.Price ?? string.Empty).Trim();
            property.Location = (property.Location ?? string.Empty).Trim();
            property.ExactLocation = (property.ExactLocation ?? string.Empty).Trim();
            property.BedRoom = (property.BedRoom ?? string.Empty).Trim();
            property.BathRoom = (property.BathRoom ?? string.Empty).Trim();
            property.Width = (property.Width ?? string.Empty).Trim();
            property.Description = (property.Description ?? string.Empty).Trim();
            property.ThumbnailUrl = NormalizeOptionalString(property.ThumbnailUrl);
            property.ThumbnailObjectName = NormalizeOptionalString(property.ThumbnailObjectName);
            property.ImageUrls = NormalizeStringList(property.ImageUrls);
            property.ImageObjectNames = NormalizeStringList(property.ImageObjectNames);
            property.KeyAmenities = NormalizeAmenities(property.KeyAmenities);
            property.NeighborhoodInsights = NormalizeNeighborhoodInsights(property.NeighborhoodInsights);
            property.PreQuestions = NormalizePreQuestions(property.PreQuestions);
            property.ClosedAt = ResolveClosedAt(property.ClosedAt, property.Status);

            var now = DateTime.UtcNow;
            property.UpdatedAt = now;

            if (isNew)
            {
                property.CreatedAt = now;
            }
        }

        private static DateTime? ResolveClosedAt(DateTime? existingClosedAt, PropertyStatus status)
        {
            return status == PropertyStatus.Closed
                ? existingClosedAt ?? DateTime.UtcNow
                : null;
        }

        private static List<string> NormalizeAmenities(List<string>? amenities)
        {
            return (amenities ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim())
                .Distinct()
                .ToList();
        }

        private static string? NormalizeOptionalString(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? null
                : value.Trim();
        }

        private static List<string> NormalizeStringList(List<string>? values)
        {
            return (values ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim())
                .Distinct()
                .ToList();
        }

        private static List<NeighborhoodInsight> NormalizeNeighborhoodInsights(List<NeighborhoodInsight>? insights)
        {
            return (insights ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.Title) || !string.IsNullOrWhiteSpace(item.Description))
                .Select(item => new NeighborhoodInsight
                {
                    Description = (item.Description ?? string.Empty).Trim(),
                    Title = (item.Title ?? string.Empty).Trim(),
                })
                .ToList();
        }

        private static List<PropertyPreQuestion> NormalizePreQuestions(List<PropertyPreQuestion>? questions)
        {
            var now = DateTime.UtcNow;
            return (questions ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item.Prompt))
                .Select((item, index) => new PropertyPreQuestion
                {
                    AttachmentObjectName = NormalizeOptionalString(item.AttachmentObjectName),
                    AttachmentUrl = NormalizeOptionalString(item.AttachmentUrl),
                    AllowsFileUpload = item.AllowsFileUpload,
                    CreatedAt = now,
                    HelperText = (item.HelperText ?? string.Empty).Trim(),
                    IsRequired = item.IsRequired,
                    Prompt = (item.Prompt ?? string.Empty).Trim(),
                    SortOrder = item.SortOrder <= 0 ? index + 1 : item.SortOrder,
                    UpdatedAt = now,
                })
                .OrderBy(item => item.SortOrder)
                .ToList();
        }
    }
}
