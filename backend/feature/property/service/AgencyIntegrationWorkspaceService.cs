using System.Text.Json;
using Data;
using Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class CommunicationProviderWriteRequest
    {
        public string ProviderName { get; set; } = "Twilio";
        public string AccountId { get; set; } = string.Empty;
        public string AuthToken { get; set; } = string.Empty;
        public string FromNumber { get; set; } = string.Empty;
        public string? BaseUrl { get; set; }
        public string? VoiceWebhookUrl { get; set; }
        public bool SupportsSms { get; set; } = true;
        public bool SupportsVoice { get; set; } = true;
    }

    public class AiWorkspaceWriteRequest
    {
        public string ProviderName { get; set; } = "OpenAI";
        public string BaseUrl { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
    }

    public class MailProviderWriteRequest
    {
        public string ProviderName { get; set; } = "Custom";
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FromEmail { get; set; } = string.Empty;
        public string? FromName { get; set; }
        public bool UseSsl { get; set; } = true;
        public bool EnableInboxSync { get; set; }
        public string? ImapHost { get; set; }
        public int ImapPort { get; set; } = 993;
        public string? ImapUsername { get; set; }
        public string? ImapPassword { get; set; }
        public bool ImapUseSsl { get; set; } = true;
        public string? ImapFolder { get; set; } = "INBOX";
        public int SyncIntervalMinutes { get; set; } = 10;
        public int MaxMessagesPerSync { get; set; } = 25;
    }

    public class UpdateAgencyIntegrationWorkspaceRequest
    {
        public CommunicationProviderWriteRequest? Communication { get; set; }
        public AiWorkspaceWriteRequest? AiProvider { get; set; }
        public MailProviderWriteRequest? Smtp { get; set; }
        public bool ClearCommunication { get; set; }
        public bool ClearAiProvider { get; set; }
        public bool ClearSmtp { get; set; }
    }

    public class AgencyIntegrationWorkspaceStatusResponse
    {
        public bool HasCommunicationConfig { get; set; }
        public DateTime? CommunicationUpdatedAt { get; set; }
        public string? CommunicationProviderName { get; set; }
        public bool HasAiProviderConfig { get; set; }
        public DateTime? AiProviderUpdatedAt { get; set; }
        public string? AiProviderName { get; set; }
        public bool HasSmtpConfig { get; set; }
        public DateTime? SmtpUpdatedAt { get; set; }
        public string? SmtpProviderName { get; set; }
        public bool MailboxSyncEnabled { get; set; }
        public int? MailboxSyncIntervalMinutes { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class AgencyIntegrationWorkspaceService
    {
        private const int SettingsRecordId = 1;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly AgencyIntegrationConnectionValidator _connectionValidator;
        private readonly AppDbContext _db;
        private readonly IDataProtector _protector;

        public AgencyIntegrationWorkspaceService(
            AppDbContext db,
            IDataProtectionProvider dataProtectionProvider,
            AgencyIntegrationConnectionValidator connectionValidator)
        {
            _db = db;
            _connectionValidator = connectionValidator;
            _protector = dataProtectionProvider.CreateProtector("agency-integrations.v2");
        }

        public async Task<AgencyIntegrationWorkspaceStatusResponse> GetStatusAsync(CancellationToken ct = default)
        {
            var record = await _db.AgencyIntegrationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);

            return MapStatus(record, _protector);
        }

        public async Task<AiWorkspaceWriteRequest?> GetAiProviderConfigAsync(CancellationToken ct = default)
        {
            var record = await _db.AgencyIntegrationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);

            return Unprotect<AiWorkspaceWriteRequest>(_protector, record?.AiProviderPayload);
        }

        public async Task<CommunicationProviderWriteRequest?> GetCommunicationConfigAsync(CancellationToken ct = default)
        {
            var record = await _db.AgencyIntegrationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);

            return Unprotect<CommunicationProviderWriteRequest>(_protector, record?.TwilioPayload);
        }

        public async Task<MailProviderWriteRequest?> GetMailProviderConfigAsync(CancellationToken ct = default)
        {
            var record = await _db.AgencyIntegrationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);

            return Unprotect<MailProviderWriteRequest>(_protector, record?.SmtpPayload);
        }

        public async Task<AgencyIntegrationWorkspaceStatusResponse> UpdateAsync(
            UpdateAgencyIntegrationWorkspaceRequest request,
            CancellationToken ct = default)
        {
            var now = DateTime.UtcNow;
            var record = await _db.AgencyIntegrationSettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId, ct);

            if (record is null)
            {
                record = new AgencyIntegrationSettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.AgencyIntegrationSettings.AddAsync(record, ct);
            }

            if (request.ClearCommunication)
            {
                record.TwilioPayload = null;
                record.TwilioUpdatedAt = null;
            }
            else if (request.Communication is not null)
            {
                var communication = NormalizeCommunication(request.Communication);
                await _connectionValidator.ValidateCommunicationAsync(communication, ct);

                record.TwilioPayload = Protect(communication);
                record.TwilioUpdatedAt = now;
            }

            if (request.ClearAiProvider)
            {
                record.AiProviderPayload = null;
                record.AiProviderUpdatedAt = null;
            }
            else if (request.AiProvider is not null)
            {
                var aiProvider = NormalizeAiProvider(request.AiProvider);
                await _connectionValidator.ValidateAiProviderAsync(aiProvider, ct);

                record.AiProviderPayload = Protect(aiProvider);
                record.AiProviderUpdatedAt = now;
            }

            if (request.ClearSmtp)
            {
                record.SmtpPayload = null;
                record.SmtpUpdatedAt = null;
            }
            else if (request.Smtp is not null)
            {
                var smtp = NormalizeSmtp(request.Smtp);
                await _connectionValidator.ValidateSmtpAsync(smtp, ct);

                if (smtp.EnableInboxSync)
                {
                    await _connectionValidator.ValidateInboxSyncAsync(smtp, ct);
                }

                record.SmtpPayload = Protect(smtp);
                record.SmtpUpdatedAt = now;
            }

            record.UpdatedAt = now;
            await _db.SaveChangesAsync(ct);

            return MapStatus(record, _protector);
        }

        private string Protect<T>(T value)
        {
            return _protector.Protect(JsonSerializer.Serialize(value, JsonOptions));
        }

        private static T? Unprotect<T>(IDataProtector protector, string? payload)
        {
            if (string.IsNullOrWhiteSpace(payload))
            {
                return default;
            }

            try
            {
                return JsonSerializer.Deserialize<T>(protector.Unprotect(payload), JsonOptions);
            }
            catch
            {
                return default;
            }
        }

        private static AgencyIntegrationWorkspaceStatusResponse MapStatus(
            AgencyIntegrationSettingsRecord? record,
            IDataProtector protector)
        {
            var communication = Unprotect<CommunicationProviderWriteRequest>(protector, record?.TwilioPayload);
            var aiProvider = Unprotect<AiWorkspaceWriteRequest>(protector, record?.AiProviderPayload);
            var smtp = Unprotect<MailProviderWriteRequest>(protector, record?.SmtpPayload);

            return new AgencyIntegrationWorkspaceStatusResponse
            {
                HasCommunicationConfig = !string.IsNullOrWhiteSpace(record?.TwilioPayload),
                CommunicationUpdatedAt = record?.TwilioUpdatedAt,
                CommunicationProviderName = NormalizeOptional(communication?.ProviderName),
                HasAiProviderConfig = !string.IsNullOrWhiteSpace(record?.AiProviderPayload),
                AiProviderUpdatedAt = record?.AiProviderUpdatedAt,
                AiProviderName = NormalizeOptional(aiProvider?.ProviderName),
                HasSmtpConfig = !string.IsNullOrWhiteSpace(record?.SmtpPayload),
                SmtpUpdatedAt = record?.SmtpUpdatedAt,
                SmtpProviderName = NormalizeOptional(smtp?.ProviderName),
                MailboxSyncEnabled = smtp?.EnableInboxSync == true,
                MailboxSyncIntervalMinutes = smtp?.EnableInboxSync == true ? smtp.SyncIntervalMinutes : null,
                UpdatedAt = record?.UpdatedAt,
            };
        }

        private static CommunicationProviderWriteRequest NormalizeCommunication(CommunicationProviderWriteRequest request)
        {
            return new CommunicationProviderWriteRequest
            {
                AccountId = (request.AccountId ?? string.Empty).Trim(),
                AuthToken = (request.AuthToken ?? string.Empty).Trim(),
                BaseUrl = NormalizeOptional(request.BaseUrl),
                FromNumber = (request.FromNumber ?? string.Empty).Trim(),
                ProviderName = NormalizeOptional(request.ProviderName) ?? "Twilio",
                VoiceWebhookUrl = NormalizeOptional(request.VoiceWebhookUrl),
                SupportsSms = request.SupportsSms,
                SupportsVoice = request.SupportsVoice,
            };
        }

        private static AiWorkspaceWriteRequest NormalizeAiProvider(AiWorkspaceWriteRequest request)
        {
            return new AiWorkspaceWriteRequest
            {
                ApiKey = (request.ApiKey ?? string.Empty).Trim(),
                BaseUrl = NormalizeOptional(request.BaseUrl) ?? string.Empty,
                Model = (request.Model ?? string.Empty).Trim(),
                ProviderName = NormalizeOptional(request.ProviderName) ?? "OpenAI",
            };
        }

        private static MailProviderWriteRequest NormalizeSmtp(MailProviderWriteRequest request)
        {
            var providerName = NormalizeOptional(request.ProviderName) ?? "Custom";
            var smtpUsername = (request.Username ?? string.Empty).Trim();
            var smtpPassword = (request.Password ?? string.Empty).Trim();

            return new MailProviderWriteRequest
            {
                FromEmail = (request.FromEmail ?? string.Empty).Trim(),
                FromName = NormalizeOptional(request.FromName),
                Host = (request.Host ?? string.Empty).Trim(),
                Password = smtpPassword,
                Port = request.Port,
                ProviderName = providerName,
                UseSsl = request.UseSsl,
                Username = smtpUsername,
                EnableInboxSync = request.EnableInboxSync,
                ImapFolder = NormalizeOptional(request.ImapFolder) ?? "INBOX",
                ImapHost = NormalizeOptional(request.ImapHost) ?? GetDefaultImapHost(providerName),
                ImapPassword = NormalizeOptional(request.ImapPassword) ?? smtpPassword,
                ImapPort = request.ImapPort <= 0 ? GetDefaultImapPort(providerName) : request.ImapPort,
                ImapUseSsl = request.ImapUseSsl,
                ImapUsername = NormalizeOptional(request.ImapUsername) ?? smtpUsername,
                MaxMessagesPerSync = Math.Clamp(request.MaxMessagesPerSync, 5, 100),
                SyncIntervalMinutes = Math.Clamp(request.SyncIntervalMinutes, 5, 120),
            };
        }

        private static string? GetDefaultImapHost(string providerName)
        {
            return providerName.Trim().ToLowerInvariant() switch
            {
                "gmail" => "imap.gmail.com",
                "outlook" => "outlook.office365.com",
                _ => null,
            };
        }

        private static int GetDefaultImapPort(string providerName)
        {
            return providerName.Trim().ToLowerInvariant() switch
            {
                "gmail" => 993,
                "outlook" => 993,
                _ => 993,
            };
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
