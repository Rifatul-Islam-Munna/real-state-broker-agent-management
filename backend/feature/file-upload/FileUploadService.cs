using Minio;
using Minio.DataModel.Args;
using Microsoft.Extensions.Options;
using NetVips;
namespace YourApp.Features.Upload;

public sealed class MinIOSettings
{
    public const string SectionName = "MinIO"; // ← clean binding key

    public string Endpoint { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string BucketName { get; init; } = string.Empty;
    public bool WithSSL { get; init; }
    public string PublicBaseUrl { get; init; } = string.Empty;
}
// ─────────────────────────────────────────────
//  DTOs
// ─────────────────────────────────────────────

public record FileUploadResponse(
    string ObjectName,
    string Url,
    long SizeBytes,
    string MimeType
);

// ─────────────────────────────────────────────
//  Interface
// ─────────────────────────────────────────────

public interface IFileUploadService
{
    Task<FileUploadResponse> UploadAsync(IFormFile file, string folder, CancellationToken ct = default);
    Task DeleteAsync(string objectName, CancellationToken ct = default);
    Task<string> GetPresignedUrlAsync(string objectName, int expirySeconds = 3600);
}

public sealed class DisabledFileUploadService : IFileUploadService
{
    private const string DisabledMessage =
        "File upload is not configured. Add MinIO settings before using upload endpoints.";

    public Task<FileUploadResponse> UploadAsync(IFormFile file, string folder, CancellationToken ct = default)
    {
        throw new InvalidOperationException(DisabledMessage);
    }

    public Task DeleteAsync(string objectName, CancellationToken ct = default)
    {
        throw new InvalidOperationException(DisabledMessage);
    }

    public Task<string> GetPresignedUrlAsync(string objectName, int expirySeconds = 3600)
    {
        throw new InvalidOperationException(DisabledMessage);
    }
}

// ─────────────────────────────────────────────
//  Service
// ─────────────────────────────────────────────

public sealed class FileUploadService : IFileUploadService
{
    private readonly IMinioClient _minio;
    private readonly MinIOSettings _settings;
    private readonly ILogger<FileUploadService> _logger;

    private static readonly HashSet<string> AllowedMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    private const long MaxFileSizeBytes = 50 * 1024 * 1024; // 50 MB

    public FileUploadService(
        IMinioClient minio,
        IOptions<MinIOSettings> settings,
        ILogger<FileUploadService> logger)
    {
        _minio = minio;
        _settings = settings.Value;
        _logger = logger;
    }

    // ── Public Methods ───────────────────────────────────────────

    public async Task<FileUploadResponse> UploadAsync(
     IFormFile file,
     string folder,
     CancellationToken ct = default)
    {
        ValidateFile(file);
        await EnsureBucketExistsAsync(ct);

        var isImage = file.ContentType.StartsWith("image/");

        // ✅ Force .avif extension for images
        var objectName = isImage
            ? Path.ChangeExtension(BuildObjectName(folder, file.FileName), ".avif")
            : BuildObjectName(folder, file.FileName);

        await UploadToBucketAsync(file, objectName, ct);

        _logger.LogInformation(
            "Uploaded: {ObjectName} | OriginalSize: {KB}KB",
            objectName, file.Length / 1024
        );

        return new FileUploadResponse(
            ObjectName: objectName,
            Url: BuildPublicUrl(objectName),
            SizeBytes: file.Length,
            MimeType: isImage ? "image/avif" : file.ContentType
        );
    }


    public async Task DeleteAsync(string objectName, CancellationToken ct = default)
    {
        var args = new RemoveObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(objectName);

        await _minio.RemoveObjectAsync(args, ct);

        _logger.LogInformation("File deleted: {ObjectName}", objectName);
    }

    public async Task<string> GetPresignedUrlAsync(string objectName, int expirySeconds = 3600)
    {
        var args = new PresignedGetObjectArgs()
            .WithBucket(_settings.BucketName)
            .WithObject(objectName)
            .WithExpiry(expirySeconds);

        return await _minio.PresignedGetObjectAsync(args);
    }

    // ── Private Helpers ──────────────────────────────────────────

    private static void ValidateFile(IFormFile file)
    {
        if (file is null || file.Length == 0)
            throw new ArgumentException("No file was provided.");

        if (file.Length > MaxFileSizeBytes)
            throw new ArgumentException($"File size exceeds the 50MB limit.");

        if (!AllowedMimeTypes.Contains(file.ContentType.ToLower()))
            throw new ArgumentException($"File type '{file.ContentType}' is not allowed.");
    }

    private async Task EnsureBucketExistsAsync(CancellationToken ct)
    {
        var existsArgs = new BucketExistsArgs().WithBucket(_settings.BucketName);
        var exists = await _minio.BucketExistsAsync(existsArgs, ct);

        if (!exists)
        {
            var makeArgs = new MakeBucketArgs().WithBucket(_settings.BucketName);
            await _minio.MakeBucketAsync(makeArgs, ct);
            _logger.LogInformation("Bucket created: {BucketName}", _settings.BucketName);
        }

        // ✅ Always enforce public policy — whether bucket is new or existing
        await ApplyPublicReadPolicyAsync(ct);
    }

    private async Task UploadToBucketAsync(
     IFormFile file,
     string objectName,
     CancellationToken ct)
    {
        if (file.ContentType.StartsWith("image/"))
        {
            var (stream, mime) = await CompressImageAsync(file);
            await using (stream)
            {
                var args = new PutObjectArgs()
                    .WithBucket(_settings.BucketName)
                    .WithObject(objectName)
                    .WithStreamData(stream)
                    .WithObjectSize(stream.Length)
                    .WithContentType(mime);

                await _minio.PutObjectAsync(args, ct);
            }
        }
        else
        {
            // PDFs and other non-image files — upload as-is
            await using var stream = file.OpenReadStream();

            var args = new PutObjectArgs()
                .WithBucket(_settings.BucketName)
                .WithObject(objectName)
                .WithStreamData(stream)
                .WithObjectSize(file.Length)
                .WithContentType(file.ContentType);

            await _minio.PutObjectAsync(args, ct);
        }
    }

    private static async Task<(MemoryStream Stream, string MimeType)>
        CompressImageAsync(IFormFile file)
    {
        var buffer = new byte[file.Length];
        await using var input = file.OpenReadStream();
        await input.ReadExactlyAsync(buffer);

        using var image = Image.NewFromBuffer(buffer);

        // ── Resize only if larger than 1920x1080 ─────────────────
        const int maxWidth = 1200;
        const int maxHeight = 800;

        var processed = image.Width > maxWidth || image.Height > maxHeight
            ? image.Resize(Math.Min(
                (double)maxWidth / image.Width,
                (double)maxHeight / image.Height))
            : image;

        // ── Encode as AVIF via libvips (same engine as sharp) ─────
        var avifBytes = processed.HeifsaveBuffer(
            q: 60,
            compression: Enums.ForeignHeifCompression.Av1,
            effort: 1
        );

        var output = new MemoryStream(avifBytes) { Position = 0 };
        return (output, "image/avif");
    }


    private async Task ApplyPublicReadPolicyAsync(CancellationToken ct)
    {
        var policy = $$"""
        {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect":    "Allow",
                "Principal": { "AWS": ["*"] },
                "Action":    ["s3:GetObject"],
                "Resource":  ["arn:aws:s3:::{{_settings.BucketName}}/*"]
            }]
        }
        """;

        var args = new SetPolicyArgs()
            .WithBucket(_settings.BucketName)
            .WithPolicy(policy);

        await _minio.SetPolicyAsync(args, ct);
    }

    private static string BuildObjectName(string folder, string fileName)
    {
        var ext = Path.GetExtension(fileName);              // .jpg
        var nameOnly = Path.GetFileNameWithoutExtension(fileName); // my-house-photo
        var cleanName = nameOnly.ToLower().Replace(" ", "-");     // my-house-photo
        var random = Guid.NewGuid().ToString("N")[..8];        // e.g. a3f2b1c9

        return $"{folder.Trim('/')}/{cleanName}-{random}{ext}";
    }



    private string BuildPublicUrl(string objectName) =>
        $"{_settings.PublicBaseUrl.TrimEnd('/')}/{_settings.BucketName}/{objectName}";
}
