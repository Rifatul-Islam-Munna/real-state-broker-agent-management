using Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Reflection;

namespace Services;

public record DatabaseMigrationResponse(
    bool BaselineRecorded,
    List<string> AppliedMigrations,
    List<string> PendingMigrations,
    string Message
);

public class DatabaseMigrationService(
    AppDbContext db,
    IWebHostEnvironment environment,
    ILogger<DatabaseMigrationService> logger)
{
    private static readonly string[] LegacyInitialTables =
    [
        "lead",
        "users",
        "contact_request",
        "deal_pipeline",
        "mail_inbox",
        "property",
        "neighborhood_insight",
    ];

    public async Task<DatabaseMigrationResponse> ApplyMigrationsAsync(CancellationToken ct = default)
    {
        EnsureDevelopmentMode();

        var baselineRecorded = await EnsureBaselineIfNeededAsync(ct);
        var pendingBefore = db.Database.GetPendingMigrations().ToList();

        if (pendingBefore.Count > 0)
        {
            await db.Database.MigrateAsync(ct);
        }

        var appliedMigrations = db.Database.GetAppliedMigrations().ToList();
        var pendingMigrations = db.Database.GetPendingMigrations().ToList();

        return new DatabaseMigrationResponse(
            baselineRecorded,
            appliedMigrations,
            pendingMigrations,
            pendingBefore.Count == 0
                ? "Database schema is already up to date."
                : "Database migrations applied successfully."
        );
    }

    private async Task<bool> EnsureBaselineIfNeededAsync(CancellationToken ct)
    {
        var allMigrations = db.Database.GetMigrations().ToList();

        if (allMigrations.Count == 0)
        {
            return false;
        }

        var connectionString = db.Database.GetConnectionString();

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Database connection string is not configured.");
        }

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(ct);

        var existingTables = await GetExistingTableNamesAsync(connection, ct);

        if (!LegacyInitialTables.All(existingTables.Contains))
        {
            return false;
        }

        var baselineMigrationId = allMigrations[0];
        var historyTableExists = existingTables.Contains("__EFMigrationsHistory");

        if (historyTableExists && await MigrationHistoryContainsAsync(connection, baselineMigrationId, ct))
        {
            return false;
        }

        logger.LogInformation(
            "Detected an existing development database created before EF migration history was enabled. Recording baseline migration {MigrationId}.",
            baselineMigrationId
        );

        if (!historyTableExists)
        {
            await using var createHistoryCommand = connection.CreateCommand();
            createHistoryCommand.CommandText =
                """
                CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                    "MigrationId" character varying(150) NOT NULL,
                    "ProductVersion" character varying(32) NOT NULL,
                    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
                );
                """;
            await createHistoryCommand.ExecuteNonQueryAsync(ct);
        }

        await using var insertBaselineCommand = connection.CreateCommand();
        insertBaselineCommand.CommandText =
            """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES (@migrationId, @productVersion)
            ON CONFLICT ("MigrationId") DO NOTHING;
            """;

        insertBaselineCommand.Parameters.AddWithValue("@migrationId", baselineMigrationId);
        insertBaselineCommand.Parameters.AddWithValue("@productVersion", GetEfProductVersion());

        await insertBaselineCommand.ExecuteNonQueryAsync(ct);

        return true;
    }

    private static async Task<HashSet<string>> GetExistingTableNamesAsync(NpgsqlConnection connection, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = current_schema()
              AND table_type = 'BASE TABLE';
            """;

        var tableNames = new HashSet<string>(StringComparer.Ordinal);
        await using var reader = await command.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            if (!reader.IsDBNull(0))
            {
                tableNames.Add(reader.GetString(0));
            }
        }

        return tableNames;
    }

    private static async Task<bool> MigrationHistoryContainsAsync(NpgsqlConnection connection, string migrationId, CancellationToken ct)
    {
        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT EXISTS (
                SELECT 1
                FROM "__EFMigrationsHistory"
                WHERE "MigrationId" = @migrationId
            );
            """;
        command.Parameters.AddWithValue("@migrationId", migrationId);

        var result = await command.ExecuteScalarAsync(ct);
        return result is bool exists && exists;
    }

    private void EnsureDevelopmentMode()
    {
        if (!environment.IsDevelopment())
        {
            throw new InvalidOperationException("Database migration endpoint is only available in Development.");
        }
    }

    private static string GetEfProductVersion()
    {
        return typeof(DbContext).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion?
            .Split('+')[0]
            ?? "10.0.5";
    }
}
