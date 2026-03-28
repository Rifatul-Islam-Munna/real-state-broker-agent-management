using System.Linq.Expressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record DocumentRepositoryResponse(
        int Id,
        string Title,
        string FileName,
        string FileUrl,
        string? FileObjectName,
        string MimeType,
        long SizeBytes,
        string Category,
        string Folder,
        string Description,
        string VersionLabel,
        List<string> Tags,
        DocumentAccessLevel AccessLevel,
        bool IsTemplate,
        bool RequiresSignature,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record DocumentRepositorySummaryResponse(
        int TotalDocuments,
        int AdminOnlyCount,
        int AgentAccessCount,
        int PublicCount,
        int TemplateCount,
        int SignatureRequiredCount,
        long TotalSizeBytes
    );

    public class CreateDocumentRepositoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string? FileObjectName { get; set; }
        public string MimeType { get; set; } = string.Empty;
        public long SizeBytes { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Folder { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string VersionLabel { get; set; } = "v1.0";
        public List<string> Tags { get; set; } = [];
        public DocumentAccessLevel AccessLevel { get; set; } = DocumentAccessLevel.AdminOnly;
        public bool IsTemplate { get; set; }
        public bool RequiresSignature { get; set; }
    }

    public class UpdateDocumentRepositoryRequest : CreateDocumentRepositoryRequest
    {
        public int Id { get; set; }
    }

    public class DocumentRepositoryService
    {
        private readonly AppDbContext _db;

        public DocumentRepositoryService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<DocumentRepositoryResponse> CreateDocumentAsync(CreateDocumentRepositoryRequest request)
        {
            var document = new DocumentRepositoryItem();
            ApplyRequest(document, request);
            document.CreatedAt = DateTime.UtcNow;
            document.UpdatedAt = document.CreatedAt;

            await _db.DocumentRepositoryItems.AddAsync(document);
            await _db.SaveChangesAsync();

            return await GetRequiredDocumentAsync(document.Id);
        }

        public async Task<DocumentRepositoryResponse?> UpdateDocumentAsync(UpdateDocumentRepositoryRequest request)
        {
            var document = await _db.DocumentRepositoryItems.FirstOrDefaultAsync(item => item.Id == request.Id);

            if (document is null)
            {
                return null;
            }

            ApplyRequest(document, request);
            document.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return await GetRequiredDocumentAsync(document.Id);
        }

        public async Task DeleteDocumentAsync(int id)
        {
            var document = await _db.DocumentRepositoryItems.FirstOrDefaultAsync(item => item.Id == id);

            if (document is null)
            {
                return;
            }

            _db.DocumentRepositoryItems.Remove(document);
            await _db.SaveChangesAsync();
        }

        public async Task<PaginatedResult<DocumentRepositoryResponse>> GetDocumentsAsync(
            int page = 1,
            int pageSize = 20,
            string? search = null,
            DocumentAccessLevel? accessLevel = null,
            string? category = null,
            bool? isTemplate = null,
            bool? requiresSignature = null)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);

            var query = _db.DocumentRepositoryItems.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLowerInvariant();
                query = query.Where(item =>
                    item.Title.ToLower().Contains(normalizedSearch) ||
                    item.FileName.ToLower().Contains(normalizedSearch) ||
                    item.Category.ToLower().Contains(normalizedSearch) ||
                    item.Folder.ToLower().Contains(normalizedSearch) ||
                    item.Description.ToLower().Contains(normalizedSearch));
            }

            if (accessLevel.HasValue)
            {
                query = query.Where(item => item.AccessLevel == accessLevel.Value);
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalizedCategory = category.Trim().ToLowerInvariant();
                query = query.Where(item => item.Category.ToLower() == normalizedCategory);
            }

            if (isTemplate.HasValue)
            {
                query = query.Where(item => item.IsTemplate == isTemplate.Value);
            }

            if (requiresSignature.HasValue)
            {
                query = query.Where(item => item.RequiresSignature == requiresSignature.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.UpdatedAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .Select(MapDocument())
                .ToListAsync();

            return new PaginatedResult<DocumentRepositoryResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }

        public async Task<DocumentRepositorySummaryResponse> GetSummaryAsync()
        {
            var query = _db.DocumentRepositoryItems.AsNoTracking();

            return new DocumentRepositorySummaryResponse(
                TotalDocuments: await query.CountAsync(),
                AdminOnlyCount: await query.CountAsync(item => item.AccessLevel == DocumentAccessLevel.AdminOnly),
                AgentAccessCount: await query.CountAsync(item => item.AccessLevel == DocumentAccessLevel.AgentAccess),
                PublicCount: await query.CountAsync(item => item.AccessLevel == DocumentAccessLevel.Public),
                TemplateCount: await query.CountAsync(item => item.IsTemplate),
                SignatureRequiredCount: await query.CountAsync(item => item.RequiresSignature),
                TotalSizeBytes: await query.SumAsync(item => item.SizeBytes)
            );
        }

        private async Task<DocumentRepositoryResponse> GetRequiredDocumentAsync(int id)
        {
            return await _db.DocumentRepositoryItems
                .AsNoTracking()
                .Where(item => item.Id == id)
                .Select(MapDocument())
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Document was not found after save.");
        }

        private static Expression<Func<DocumentRepositoryItem, DocumentRepositoryResponse>> MapDocument()
        {
            return item => new DocumentRepositoryResponse(
                item.Id,
                item.Title,
                item.FileName,
                item.FileUrl,
                item.FileObjectName,
                item.MimeType,
                item.SizeBytes,
                item.Category,
                item.Folder,
                item.Description,
                item.VersionLabel,
                item.Tags,
                item.AccessLevel,
                item.IsTemplate,
                item.RequiresSignature,
                item.CreatedAt,
                item.UpdatedAt
            );
        }

        private static void ApplyRequest(DocumentRepositoryItem document, CreateDocumentRepositoryRequest request)
        {
            var title = (request.Title ?? string.Empty).Trim();
            var fileName = (request.FileName ?? string.Empty).Trim();
            var fileUrl = (request.FileUrl ?? string.Empty).Trim();
            var mimeType = (request.MimeType ?? string.Empty).Trim().ToLowerInvariant();
            var category = (request.Category ?? string.Empty).Trim();
            var folder = (request.Folder ?? string.Empty).Trim();
            var versionLabel = (request.VersionLabel ?? string.Empty).Trim();

            if (title.Length == 0)
            {
                throw new ArgumentException("Title is required.");
            }

            if (fileName.Length == 0)
            {
                throw new ArgumentException("Upload a file before saving.");
            }

            if (fileUrl.Length == 0)
            {
                throw new ArgumentException("Document file URL is required.");
            }

            if (mimeType.Length == 0)
            {
                throw new ArgumentException("Document MIME type is required.");
            }

            if (request.SizeBytes <= 0)
            {
                throw new ArgumentException("Document size must be greater than zero.");
            }

            document.Title = title;
            document.FileName = fileName;
            document.FileUrl = fileUrl;
            document.FileObjectName = NullIfEmpty(request.FileObjectName);
            document.MimeType = mimeType;
            document.SizeBytes = request.SizeBytes;
            document.Category = category.Length > 0 ? category : "General";
            document.Folder = folder.Length > 0 ? folder : "Repository";
            document.Description = (request.Description ?? string.Empty).Trim();
            document.VersionLabel = versionLabel.Length > 0 ? versionLabel : "v1.0";
            document.Tags = NormalizeTags(request.Tags);
            document.AccessLevel = request.AccessLevel;
            document.IsTemplate = request.IsTemplate;
            document.RequiresSignature = request.RequiresSignature;
        }

        private static List<string> NormalizeTags(IEnumerable<string>? values)
        {
            return (values ?? [])
                .Select(item => (item ?? string.Empty).Trim())
                .Where(item => item.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static string? NullIfEmpty(string? value)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length > 0 ? normalized : null;
        }
    }
}
