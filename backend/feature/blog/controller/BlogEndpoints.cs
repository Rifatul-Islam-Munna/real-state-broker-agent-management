using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreateBlogPostEndpoint : Endpoint<CreateBlogPostRequest, BlogPostResponse>
    {
        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Post("/blogs");
            Roles("Admin");
            Summary(s => s.Summary = "Create a blog post");
        }

        public override async Task HandleAsync(CreateBlogPostRequest req, CancellationToken ct)
        {
            try
            {
                var result = await BlogService.CreateBlogPostAsync(req);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400);
            }
        }
    }

    public class UpdateBlogPostEndpoint : Endpoint<UpdateBlogPostRequest, BlogPostResponse>
    {
        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Patch("/blogs");
            Roles("Admin");
            Summary(s => s.Summary = "Update a blog post");
        }

        public override async Task HandleAsync(UpdateBlogPostRequest req, CancellationToken ct)
        {
            try
            {
                var result = await BlogService.UpdateBlogPostAsync(req);

                if (result is null)
                {
                    await Send.NotFoundAsync(ct);
                    return;
                }

                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400);
            }
        }
    }

    public class DeleteBlogPostEndpoint : Endpoint<DeleteBlogPostEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Delete("/blogs");
            Roles("Admin");
            Summary(s => s.Summary = "Delete a blog post");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await BlogService.DeleteBlogPostAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetAdminBlogPostsEndpoint : Endpoint<GetAdminBlogPostsEndpoint.Request, PaginatedResult<BlogPostResponse>>
    {
        public class Request
        {
            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public bool? IsPublished { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 12;
        }

        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Get("/blogs/admin");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch admin blog posts");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            var result = await BlogService.GetAdminBlogPostsAsync(req.Page, req.PageSize, req.Search, req.IsPublished);
            await Send.OkAsync(result, ct);
        }
    }

    public class GetBlogPostsEndpoint : Endpoint<GetBlogPostsEndpoint.Request, PaginatedResult<BlogPostSummaryResponse>>
    {
        public class Request
        {
            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public string? Category { get; set; }

            [QueryParam]
            public bool FeaturedOnly { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 9;
        }

        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Get("/blogs");
            AllowAnonymous();
            Summary(s => s.Summary = "Fetch public blog posts");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            var result = await BlogService.GetBlogPostsAsync(req.Page, req.PageSize, req.Search, req.Category, req.FeaturedOnly);
            await Send.OkAsync(result, ct);
        }
    }

    public class GetBlogPostDetailEndpoint : Endpoint<GetBlogPostDetailEndpoint.Request, BlogPostDetailResponse>
    {
        public class Request
        {
            [QueryParam]
            public string? Slug { get; set; }
        }

        public required BlogService BlogService { get; set; }

        public override void Configure()
        {
            Get("/blogs/details");
            AllowAnonymous();
            Summary(s => s.Summary = "Fetch a public blog post by slug");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(req.Slug))
            {
                AddError("Slug is required");
                await Send.ErrorsAsync(400);
                return;
            }

            var result = await BlogService.GetBlogPostBySlugAsync(req.Slug);

            if (result is null)
            {
                await Send.NotFoundAsync(ct);
                return;
            }

            await Send.OkAsync(result, ct);
        }
    }
}
