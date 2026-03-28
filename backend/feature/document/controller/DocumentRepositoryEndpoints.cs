using Entities;
using FastEndpoints;
using Models;
using Services;

namespace Endpoints
{
    public class CreateDocumentRepositoryEndpoint : Endpoint<CreateDocumentRepositoryRequest, DocumentRepositoryResponse>
    {
        public required DocumentRepositoryService DocumentRepositoryService { get; set; }

        public override void Configure()
        {
            Post("/documents");
            Roles("Admin");
            Summary(s => s.Summary = "Create a document repository item");
        }

        public override async Task HandleAsync(CreateDocumentRepositoryRequest req, CancellationToken ct)
        {
            try
            {
                var result = await DocumentRepositoryService.CreateDocumentAsync(req);
                await Send.OkAsync(result, ct);
            }
            catch (ArgumentException ex)
            {
                AddError(ex.Message);
                await Send.ErrorsAsync(400, ct);
            }
        }
    }

    public class UpdateDocumentRepositoryEndpoint : Endpoint<UpdateDocumentRepositoryRequest, DocumentRepositoryResponse>
    {
        public required DocumentRepositoryService DocumentRepositoryService { get; set; }

        public override void Configure()
        {
            Patch("/documents");
            Roles("Admin");
            Summary(s => s.Summary = "Update a document repository item");
        }

        public override async Task HandleAsync(UpdateDocumentRepositoryRequest req, CancellationToken ct)
        {
            try
            {
                var result = await DocumentRepositoryService.UpdateDocumentAsync(req);

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
                await Send.ErrorsAsync(400, ct);
            }
        }
    }

    public class DeleteDocumentRepositoryEndpoint : Endpoint<DeleteDocumentRepositoryEndpoint.Request>
    {
        public class Request
        {
            [QueryParam]
            public int Id { get; set; }
        }

        public required DocumentRepositoryService DocumentRepositoryService { get; set; }

        public override void Configure()
        {
            Delete("/documents");
            Roles("Admin");
            Summary(s => s.Summary = "Delete a document repository item");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            await DocumentRepositoryService.DeleteDocumentAsync(req.Id);
            await Send.NoContentAsync(ct);
        }
    }

    public class GetDocumentRepositoryEndpoint : Endpoint<GetDocumentRepositoryEndpoint.Request, PaginatedResult<DocumentRepositoryResponse>>
    {
        public class Request
        {
            [QueryParam]
            public string? Search { get; set; }

            [QueryParam]
            public DocumentAccessLevel? AccessLevel { get; set; }

            [QueryParam]
            public string? Category { get; set; }

            [QueryParam]
            public bool? IsTemplate { get; set; }

            [QueryParam]
            public bool? RequiresSignature { get; set; }

            [QueryParam]
            public int Page { get; set; } = 1;

            [QueryParam]
            public int PageSize { get; set; } = 20;
        }

        public required DocumentRepositoryService DocumentRepositoryService { get; set; }

        public override void Configure()
        {
            Get("/documents");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch document repository items");
        }

        public override async Task HandleAsync(Request req, CancellationToken ct)
        {
            var result = await DocumentRepositoryService.GetDocumentsAsync(
                req.Page,
                req.PageSize,
                req.Search,
                req.AccessLevel,
                req.Category,
                req.IsTemplate,
                req.RequiresSignature);

            await Send.OkAsync(result, ct);
        }
    }

    public class GetDocumentRepositorySummaryEndpoint : EndpointWithoutRequest<DocumentRepositorySummaryResponse>
    {
        public required DocumentRepositoryService DocumentRepositoryService { get; set; }

        public override void Configure()
        {
            Get("/documents/summary");
            Roles("Admin");
            Summary(s => s.Summary = "Fetch document repository summary");
        }

        public override async Task HandleAsync(CancellationToken ct)
        {
            var result = await DocumentRepositoryService.GetSummaryAsync();
            await Send.OkAsync(result, ct);
        }
    }
}
