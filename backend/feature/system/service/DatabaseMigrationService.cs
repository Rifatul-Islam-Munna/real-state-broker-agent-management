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
        await EnsureLegacySchemaCompatibilityAsync(ct);
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
                    migration_id character varying(150) NOT NULL,
                    product_version character varying(32) NOT NULL,
                    CONSTRAINT pk___ef_migrations_history PRIMARY KEY (migration_id)
                );
                """;
            await createHistoryCommand.ExecuteNonQueryAsync(ct);
        }

        await using var insertBaselineCommand = connection.CreateCommand();
        insertBaselineCommand.CommandText =
            """
            INSERT INTO "__EFMigrationsHistory" (migration_id, product_version)
            VALUES (@migrationId, @productVersion)
            ON CONFLICT (migration_id) DO NOTHING;
            """;

        insertBaselineCommand.Parameters.AddWithValue("@migrationId", baselineMigrationId);
        insertBaselineCommand.Parameters.AddWithValue("@productVersion", GetEfProductVersion());

        await insertBaselineCommand.ExecuteNonQueryAsync(ct);

        return true;
    }

    private async Task EnsureLegacySchemaCompatibilityAsync(CancellationToken ct)
    {
        var connectionString = db.Database.GetConnectionString();

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Database connection string is not configured.");
        }

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(ct);

        var existingTables = await GetExistingTableNamesAsync(connection, ct);

        if (existingTables.Contains("property"))
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                """
                ALTER TABLE property ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;
                ALTER TABLE property ADD COLUMN IF NOT EXISTS document_repository_item_ids jsonb NOT NULL DEFAULT '[]';
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_address text;
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_company text;
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_email text NOT NULL DEFAULT '';
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_name text NOT NULL DEFAULT '';
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_notes text;
                ALTER TABLE property ADD COLUMN IF NOT EXISTS owner_phone text NOT NULL DEFAULT '';
                """;
            await command.ExecuteNonQueryAsync(ct);
        }

        if (existingTables.Contains("lead"))
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                """
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS next_action_date timestamp with time zone;
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS next_action_type text NOT NULL DEFAULT '';
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS follow_up_status integer NOT NULL DEFAULT 0;
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS showing_agent_name text NOT NULL DEFAULT '';
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS showing_agent_email text NOT NULL DEFAULT '';
                ALTER TABLE lead ADD COLUMN IF NOT EXISTS showing_agent_phone text NOT NULL DEFAULT '';
                """;
            await command.ExecuteNonQueryAsync(ct);
        }

        if (!existingTables.Contains("property_pre_question"))
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                """
                CREATE TABLE IF NOT EXISTS property_pre_question (
                    id integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                    property_id integer NOT NULL,
                    prompt text NOT NULL DEFAULT '',
                    helper_text text NOT NULL DEFAULT '',
                    is_required boolean NOT NULL DEFAULT FALSE,
                    sort_order integer NOT NULL DEFAULT 0,
                    allows_file_upload boolean NOT NULL DEFAULT FALSE,
                    attachment_url text NULL,
                    attachment_object_name text NULL,
                    created_at timestamp with time zone NOT NULL DEFAULT now(),
                    updated_at timestamp with time zone NOT NULL DEFAULT now()
                );

                CREATE INDEX IF NOT EXISTS ix_property_pre_question_property_id
                    ON property_pre_question (property_id);
                """;
            await command.ExecuteNonQueryAsync(ct);
        }
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
                WHERE migration_id = @migrationId
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
