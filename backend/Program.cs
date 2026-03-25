using Data;
using dotenv.net;
using FastEndpoints;
using FastEndpoints.Security;
using FastEndpoints.Swagger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Minio;
using Scalar.AspNetCore;
using Serilog;
using System.Text;
using System.Text.Json.Serialization;
using YourApp.Features.Upload;

DotEnv.Load();

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("Default")
        ?? Environment.GetEnvironmentVariable("DATABASE_URL"))
        .UseSnakeCaseNamingConvention()
        .EnableSensitiveDataLogging(builder.Environment.IsDevelopment())
);

builder.Services.Configure<MinIOSettings>(
    builder.Configuration.GetSection(MinIOSettings.SectionName)
);
var minioEndpoint = builder.Configuration[$"{MinIOSettings.SectionName}:Endpoint"];
var minioBucketName = builder.Configuration[$"{MinIOSettings.SectionName}:BucketName"];

builder.Services.AddFastEndpoints();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!)
            ),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var token = context.Request.Headers["access_token"].FirstOrDefault();
                if (!string.IsNullOrEmpty(token))
                {
                    context.Token = token;
                }

                return Task.CompletedTask;
            }
        };
    });
builder.Services.AddAuthorization();

builder.Services.SwaggerDocument(o =>
{
    o.DocumentSettings = s =>
    {
        s.Title = "Real Estate API";
        s.Version = "v1";
    };
});

builder.Services.Scan(scan => scan
    .FromAssemblyOf<Program>()
    .AddClasses(c => c.Where(t =>
        ((t.Name.EndsWith("Service") ||
        (t.Namespace != null && t.Namespace.EndsWith("Service")))
        && t != typeof(FileUploadService)
        && t != typeof(DisabledFileUploadService))
    ))
    .AsSelf()
    .WithScopedLifetime()
);

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter())
);

if (!string.IsNullOrWhiteSpace(minioEndpoint) && !string.IsNullOrWhiteSpace(minioBucketName))
{
    builder.Services.AddSingleton<IMinioClient>(sp =>
    {
        var cfg = sp.GetRequiredService<IOptions<MinIOSettings>>().Value;

        return new MinioClient()
            .WithEndpoint(cfg.Endpoint)
            .WithCredentials(cfg.AccessKey, cfg.SecretKey)
            .WithSSL(cfg.WithSSL)
            .Build();
    });
    builder.Services.AddSingleton<IFileUploadService, FileUploadService>();
}
else
{
    builder.Services.AddSingleton<IFileUploadService, DisabledFileUploadService>();
}

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.UseFastEndpoints(c =>
{
    c.Endpoints.RoutePrefix = "api";
    c.Errors.UseProblemDetails();
    c.Serializer.Options.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

app.UseOpenApi(c => c.Path = "/openapi/{documentName}.json");
app.MapScalarApiReference();
// http://localhost:4000/scalar/v1
app.Run();
