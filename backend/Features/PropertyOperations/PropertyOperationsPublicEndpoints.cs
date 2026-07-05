using FastEndpoints;
using Models;
using Services;

namespace Features.PropertyOperations;

public sealed class GetPublicPropertyOperationsRequestEndpoint(PropertyOperationsPublicService service)
    : Endpoint<GetPublicPropertyOperationsRequestEndpoint.Request, PublicPropertyOperationsRequestResponse>
{
    public sealed class Request
    {
        public string Token { get; set; } = string.Empty;
    }

    public override void Configure()
    {
        Get("/property-operations/public/{Token}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await service.GetPublicAsync(req.Token, ct);
        var access = result.Access;
        var settings = result.Settings;
        await Send.OkAsync(new PublicPropertyOperationsRequestResponse
        {
            BusinessName = settings.BusinessName,
            LogoUrl = settings.LogoUrl,
            BrandColor = settings.BrandColor,
            WelcomeMessage = settings.WelcomeMessage,
            TermsText = settings.TermsText,
            RequireName = settings.RequireName,
            RequireEmail = settings.RequireEmail,
            RequirePhone = settings.RequirePhone,
            AllowFileUploads = access.AllowFileUploads,
            ShowPropertyAddress = settings.ShowPropertyAddress,
            PropertyTitle = access.Workspace.Property.Title,
            PropertyLocation = access.Workspace.Property.ExactLocation ?? access.Workspace.Property.Location ?? string.Empty,
            ModuleKey = access.ModuleKey,
            Title = access.Title,
            Instructions = access.Instructions,
            RecipientLabel = access.RecipientLabel,
            FormSchemaJson = access.FormSchemaJson,
            ExpiresAt = access.ExpiresAt,
            RemainingUses = Math.Max(0, access.MaxUses - access.UseCount),
        }, ct);
    }
}

public sealed class SubmitPublicPropertyOperationsRequestEndpoint(PropertyOperationsPublicService service)
    : Endpoint<SubmitPublicPropertyOperationsRequestEndpoint.Request, PropertyOperationsPublicSubmissionResponse>
{
    public sealed class Request : SubmitPropertyOperationsPublicRequest
    {
        public string Token { get; set; } = string.Empty;
    }

    public override void Configure()
    {
        Post("/property-operations/public/{Token}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var item = await service.SubmitAsync(req.Token, req, ct);
        await Send.OkAsync(new PropertyOperationsPublicSubmissionResponse
        {
            Id = item.Id,
            ResponderName = item.ResponderName,
            ResponderEmail = item.ResponderEmail,
            ResponderPhone = item.ResponderPhone,
            Notes = item.Notes,
            ResponseJson = item.ResponseJson,
            AttachmentUrlsJson = item.AttachmentUrlsJson,
            SubmittedAt = item.SubmittedAt,
        }, ct);
    }
}
