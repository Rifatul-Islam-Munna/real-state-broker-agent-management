using FastEndpoints;
using Services;

namespace Endpoints;

public class ApplyDatabaseMigrationsEndpoint(DatabaseMigrationService migrationService) : EndpointWithoutRequest<DatabaseMigrationResponse>
{
    public override void Configure()
    {
        Post("/dev/database/migrate");
        AllowAnonymous();
        Summary(s =>
        {
            s.Summary = "Apply database migrations in development";
            s.Description = "Development-only endpoint that baselines legacy tables if needed and then runs EF Core migrations.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var result = await migrationService.ApplyMigrationsAsync(ct);
        await Send.OkAsync(result, ct);
    }
}
