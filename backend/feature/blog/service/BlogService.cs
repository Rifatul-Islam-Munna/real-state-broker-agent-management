using System.Text.RegularExpressions;
using Data;
using Entities;
using Microsoft.EntityFrameworkCore;
using Models;

namespace Services
{
    public record BlogPostSummaryResponse(
        int Id,
        string Title,
        string Slug,
        string Excerpt,
        string Category,
        string CoverImageUrl,
        string AuthorName,
        DateTime PublishedAt,
        int ReadTimeMinutes,
        bool IsFeatured
    );

    public record BlogPostResponse(
        int Id,
        string Title,
        string Slug,
        string Excerpt,
        string Category,
        string CoverImageUrl,
        string? CoverImageObjectName,
        string AuthorName,
        int ReadTimeMinutes,
        bool IsFeatured,
        bool IsPublished,
        DateTime? PublishedAt,
        List<string> Tags,
        List<string> Highlights,
        List<string> Paragraphs,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    public record BlogPostDetailResponse(
        int Id,
        string Title,
        string Slug,
        string Excerpt,
        string Category,
        string CoverImageUrl,
        string AuthorName,
        DateTime PublishedAt,
        int ReadTimeMinutes,
        List<string> Tags,
        List<string> Highlights,
        List<string> Paragraphs,
        List<BlogPostSummaryResponse> RelatedPosts
    );

    public class CreateBlogPostRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Excerpt { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string CoverImageUrl { get; set; } = string.Empty;
        public string? CoverImageObjectName { get; set; }
        public string AuthorName { get; set; } = string.Empty;
        public int ReadTimeMinutes { get; set; } = 5;
        public bool IsFeatured { get; set; }
        public bool IsPublished { get; set; } = true;
        public DateTime? PublishedAt { get; set; }
        public List<string> Tags { get; set; } = [];
        public List<string> Highlights { get; set; } = [];
        public List<string> Paragraphs { get; set; } = [];
    }

    public class UpdateBlogPostRequest : CreateBlogPostRequest
    {
        public int Id { get; set; }
    }

    public class BlogService
    {
        private readonly AppDbContext _db;

        public BlogService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<BlogPostResponse> CreateBlogPostAsync(CreateBlogPostRequest request)
        {
            var post = new BlogPost();
            await ApplyRequestAsync(post, request);
            post.CreatedAt = DateTime.UtcNow;
            post.UpdatedAt = post.CreatedAt;

            await _db.BlogPosts.AddAsync(post);
            await _db.SaveChangesAsync();

            return MapAdmin(post);
        }

        public async Task<BlogPostResponse?> UpdateBlogPostAsync(UpdateBlogPostRequest request)
        {
            var post = await _db.BlogPosts.FirstOrDefaultAsync(item => item.Id == request.Id);

            if (post is null)
            {
                return null;
            }

            await ApplyRequestAsync(post, request);
            post.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return MapAdmin(post);
        }

        public async Task DeleteBlogPostAsync(int id)
        {
            var post = await _db.BlogPosts.FirstOrDefaultAsync(item => item.Id == id);

            if (post is null)
            {
                return;
            }

            _db.BlogPosts.Remove(post);
            await _db.SaveChangesAsync();
        }

        public async Task<PaginatedResult<BlogPostResponse>> GetAdminBlogPostsAsync(
            int page = 1,
            int pageSize = 12,
            string? search = null,
            bool? isPublished = null)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);

            var query = _db.BlogPosts.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLowerInvariant();
                query = query.Where(item =>
                    item.Title.ToLower().Contains(normalizedSearch) ||
                    item.Excerpt.ToLower().Contains(normalizedSearch) ||
                    item.Category.ToLower().Contains(normalizedSearch) ||
                    item.AuthorName.ToLower().Contains(normalizedSearch));
            }

            if (isPublished.HasValue)
            {
                query = query.Where(item => item.IsPublished == isPublished.Value);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.UpdatedAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .ToListAsync();

            return new PaginatedResult<BlogPostResponse>
            {
                Items = items.Select(MapAdmin).ToList(),
                TotalCount = totalCount,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }

        public async Task<PaginatedResult<BlogPostSummaryResponse>> GetBlogPostsAsync(
            int page = 1,
            int pageSize = 9,
            string? search = null,
            string? category = null,
            bool featuredOnly = false)
        {
            var normalizedPage = Math.Max(1, page);
            var normalizedPageSize = Math.Max(1, pageSize);

            var query = _db.BlogPosts
                .AsNoTracking()
                .Where(item => item.IsPublished)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLowerInvariant();
                query = query.Where(item =>
                    item.Title.ToLower().Contains(normalizedSearch) ||
                    item.Excerpt.ToLower().Contains(normalizedSearch) ||
                    item.Category.ToLower().Contains(normalizedSearch) ||
                    item.AuthorName.ToLower().Contains(normalizedSearch));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                var normalizedCategory = category.Trim().ToLowerInvariant();
                query = query.Where(item => item.Category.ToLower() == normalizedCategory);
            }

            if (featuredOnly)
            {
                query = query.Where(item => item.IsFeatured);
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(item => item.IsFeatured)
                .ThenByDescending(item => item.PublishedAt ?? item.UpdatedAt)
                .Skip((normalizedPage - 1) * normalizedPageSize)
                .Take(normalizedPageSize)
                .ToListAsync();

            return new PaginatedResult<BlogPostSummaryResponse>
            {
                Items = items.Select(MapSummary).ToList(),
                TotalCount = totalCount,
                Page = normalizedPage,
                PageSize = normalizedPageSize,
                TotalPages = (int)Math.Ceiling(totalCount / (double)normalizedPageSize)
            };
        }

        public async Task<BlogPostDetailResponse?> GetBlogPostBySlugAsync(string slug)
        {
            var normalizedSlug = (slug ?? string.Empty).Trim().ToLowerInvariant();

            if (normalizedSlug.Length == 0)
            {
                return null;
            }

            var post = await _db.BlogPosts
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.IsPublished && item.Slug.ToLower() == normalizedSlug);

            if (post is null)
            {
                return null;
            }

            var relatedPosts = await _db.BlogPosts
                .AsNoTracking()
                .Where(item =>
                    item.IsPublished &&
                    item.Id != post.Id &&
                    item.Category.ToLower() == post.Category.ToLower())
                .OrderByDescending(item => item.IsFeatured)
                .ThenByDescending(item => item.PublishedAt ?? item.UpdatedAt)
                .Take(3)
                .ToListAsync();

            return new BlogPostDetailResponse(
                post.Id,
                post.Title,
                post.Slug,
                post.Excerpt,
                post.Category,
                post.CoverImageUrl,
                post.AuthorName,
                post.PublishedAt ?? post.UpdatedAt,
                post.ReadTimeMinutes,
                post.Tags.ToList(),
                post.Highlights.ToList(),
                post.Paragraphs.ToList(),
                relatedPosts.Select(MapSummary).ToList()
            );
        }

        private async Task ApplyRequestAsync(BlogPost post, CreateBlogPostRequest request)
        {
            var title = (request.Title ?? string.Empty).Trim();
            var excerpt = (request.Excerpt ?? string.Empty).Trim();
            var category = (request.Category ?? string.Empty).Trim();
            var coverImageUrl = (request.CoverImageUrl ?? string.Empty).Trim();
            var authorName = (request.AuthorName ?? string.Empty).Trim();
            var paragraphs = NormalizeOrderedTextList(request.Paragraphs);

            if (title.Length == 0)
            {
                throw new ArgumentException("Title is required.");
            }

            if (excerpt.Length == 0)
            {
                throw new ArgumentException("Excerpt is required.");
            }

            if (category.Length == 0)
            {
                throw new ArgumentException("Category is required.");
            }

            if (coverImageUrl.Length == 0)
            {
                throw new ArgumentException("Cover image is required.");
            }

            if (authorName.Length == 0)
            {
                throw new ArgumentException("Author name is required.");
            }

            if (paragraphs.Count == 0)
            {
                throw new ArgumentException("Add at least one article paragraph.");
            }

            post.Title = title;
            post.Slug = await EnsureUniqueSlugAsync(title, post.Id == 0 ? null : post.Id);
            post.Excerpt = excerpt;
            post.Category = category;
            post.CoverImageUrl = coverImageUrl;
            post.CoverImageObjectName = NullIfEmpty(request.CoverImageObjectName);
            post.AuthorName = authorName;
            post.ReadTimeMinutes = Math.Max(1, request.ReadTimeMinutes);
            post.IsFeatured = request.IsFeatured;
            post.IsPublished = request.IsPublished;
            post.PublishedAt = request.IsPublished
                ? request.PublishedAt?.ToUniversalTime() ?? post.PublishedAt ?? DateTime.UtcNow
                : request.PublishedAt?.ToUniversalTime();
            post.Tags = NormalizeDistinctTextList(request.Tags);
            post.Highlights = NormalizeOrderedTextList(request.Highlights);
            post.Paragraphs = paragraphs;
        }

        private async Task<string> EnsureUniqueSlugAsync(string title, int? excludeId)
        {
            var baseSlug = GenerateSlug(title);
            var slug = baseSlug;
            var suffix = 2;

            while (await _db.BlogPosts.AnyAsync(item => item.Slug == slug && (!excludeId.HasValue || item.Id != excludeId.Value)))
            {
                slug = $"{baseSlug}-{suffix}";
                suffix++;
            }

            return slug;
        }

        private static string GenerateSlug(string title)
        {
            var slug = (title ?? string.Empty).Trim().ToLowerInvariant();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", string.Empty);
            slug = Regex.Replace(slug, @"\s+", "-");
            slug = Regex.Replace(slug, @"-+", "-");
            slug = slug.Trim('-');

            return slug.Length > 0 ? slug : "blog-post";
        }

        private static List<string> NormalizeDistinctTextList(IEnumerable<string>? items)
        {
            return (items ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }

        private static List<string> NormalizeOrderedTextList(IEnumerable<string>? items)
        {
            return (items ?? [])
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Select(item => item.Trim())
                .ToList();
        }

        private static string? NullIfEmpty(string? value)
        {
            var normalized = (value ?? string.Empty).Trim();
            return normalized.Length == 0 ? null : normalized;
        }

        private static BlogPostResponse MapAdmin(BlogPost post)
        {
            return new BlogPostResponse(
                post.Id,
                post.Title,
                post.Slug,
                post.Excerpt,
                post.Category,
                post.CoverImageUrl,
                post.CoverImageObjectName,
                post.AuthorName,
                post.ReadTimeMinutes,
                post.IsFeatured,
                post.IsPublished,
                post.PublishedAt,
                post.Tags.ToList(),
                post.Highlights.ToList(),
                post.Paragraphs.ToList(),
                post.CreatedAt,
                post.UpdatedAt
            );
        }

        private static BlogPostSummaryResponse MapSummary(BlogPost post)
        {
            return new BlogPostSummaryResponse(
                post.Id,
                post.Title,
                post.Slug,
                post.Excerpt,
                post.Category,
                post.CoverImageUrl,
                post.AuthorName,
                post.PublishedAt ?? post.UpdatedAt,
                post.ReadTimeMinutes,
                post.IsFeatured
            );
        }
    }
}
