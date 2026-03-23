using FastEndpoints;

namespace YourApp.Features.Upload;

public sealed class FileUploadRequest
{
    public IFormFile File { get; set; } = null!;
    public string Folder { get; set; } = "general";
}

public sealed class FileUploadEndpoint : Endpoint<FileUploadRequest, FileUploadResponse>
{
    private readonly IFileUploadService _uploadService;

    public FileUploadEndpoint(IFileUploadService uploadService)
    {
        _uploadService = uploadService;
    }

    public override void Configure()
    {
        Post("/upload");
        AllowFileUploads();
        AllowAnonymous();
    }

    public override async Task HandleAsync(FileUploadRequest req, CancellationToken ct)
    {
        if (req.File is null || req.File.Length == 0)
        {
            AddError(r => r.File, "No file was provided.");
            await Send
            .ErrorsAsync
            (cancellation: ct);
            return;
        }

        try
        {
            var result = await _uploadService.UploadAsync(req.File, req.Folder, ct);
            await Send.OkAsync(result, ct);  // ✅ latest syntax
        }
        catch (ArgumentException ex)
        {
            AddError(ex.Message);
            await Send
            .ErrorsAsync(400, ct);
        }
    }
}




public sealed class FileDeleteRequest
{
    [QueryParam] public string ObjectName { get; set; } = string.Empty;
}
public sealed class FileDeleteEndpoint : Endpoint<FileDeleteRequest>
{
    private readonly IFileUploadService _uploadService;

    public FileDeleteEndpoint(IFileUploadService uploadService)
    {
        _uploadService = uploadService;
    }

    public override void Configure()
    {
        Delete("/upload");
        AllowAnonymous();

        // ✅ Tells FastEndpoints + Swagger: no request body expected
        Description(x => x
            .Accepts<FileDeleteRequest>()   // shows ObjectName in Swagger ✅
            .Produces(200)
            .Produces(400)
            .WithTags("File Upload")
        );

        Summary(s =>
        {
            s.Summary = "Delete a file from MinIO";
            s.Params["ObjectName"] = "Object path e.g. general/uuid.png";
        });
    }

    public override async Task HandleAsync(FileDeleteRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.ObjectName))
        {
            AddError(r => r.ObjectName, "Object name is required.");
            await Send.ErrorsAsync(400, ct);
            return;
        }

        await _uploadService.DeleteAsync(req.ObjectName, ct);
        await Send.OkAsync(new { message = "File deleted" }, ct);
    }
}
