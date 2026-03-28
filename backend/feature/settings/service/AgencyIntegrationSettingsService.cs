using System.Text.Json;
using Data;
using Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public class TwilioIntegrationWriteRequest
    {
        public string AccountSid { get; set; } = string.Empty;
        public string AuthToken { get; set; } = string.Empty;
        public string FromNumber { get; set; } = string.Empty;
    }

    public class AiProviderIntegrationWriteRequest
    {
        public string ProviderName { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;
        public string ApiKey { get; set; } = string.Empty;
    }

    public class SmtpIntegrationWriteRequest
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FromEmail { get; set; } = string.Empty;
        public string? FromName { get; set; }
        public bool UseSsl { get; set; } = true;
    }

    public class UpdateAgencyIntegrationSettingsRequest
    {
        public TwilioIntegrationWriteRequest? Twilio { get; set; }
        public AiProviderIntegrationWriteRequest? AiProvider { get; set; }
        public SmtpIntegrationWriteRequest? Smtp { get; set; }
        public bool ClearTwilio { get; set; }
        public bool ClearAiProvider { get; set; }
        public bool ClearSmtp { get; set; }
    }

    public class AgencyIntegrationStatusResponse
    {
        public bool HasTwilioConfig { get; set; }
        public DateTime? TwilioUpdatedAt { get; set; }
        public bool HasAiProviderConfig { get; set; }
        public DateTime? AiProviderUpdatedAt { get; set; }
        public bool HasSmtpConfig { get; set; }
        public DateTime? SmtpUpdatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class AgencyIntegrationSettingsService
    {
        private const int SettingsRecordId = 1;

        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly AppDbContext _db;
        private readonly IDataProtector _protector;

        public AgencyIntegrationSettingsService(AppDbContext db, IDataProtectionProvider dataProtectionProvider)
        {
            _db = db;
            _protector = dataProtectionProvider.CreateProtector("agency-integrations.v1");
        }

        public async Task<AgencyIntegrationStatusResponse> GetStatusAsync()
        {
            var record = await _db.AgencyIntegrationSettings
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == SettingsRecordId);

            return MapStatus(record);
        }

        public async Task<AgencyIntegrationStatusResponse> UpdateAsync(UpdateAgencyIntegrationSettingsRequest request)
        {
            var now = DateTime.UtcNow;

            var record = await _db.AgencyIntegrationSettings.FirstOrDefaultAsync(item => item.Id == SettingsRecordId);
            if (record is null)
            {
                record = new AgencyIntegrationSettingsRecord
                {
                    Id = SettingsRecordId,
                    CreatedAt = now,
                };
                await _db.AgencyIntegrationSettings.AddAsync(record);
            }

            if (request.ClearTwilio)
            {
                record.TwilioPayload = null;
                record.TwilioUpdatedAt = null;
            }
            else if (request.Twilio is not null)
            {
                ValidateTwilio(request.Twilio);
                record.TwilioPayload = Protect(request.Twilio);
                record.TwilioUpdatedAt = now;
            }

            if (request.ClearAiProvider)
            {
                record.AiProviderPayload = null;
                record.AiProviderUpdatedAt = null;
            }
            else if (request.AiProvider is not null)
            {
                ValidateAiProvider(request.AiProvider);
                record.AiProviderPayload = Protect(request.AiProvider);
                record.AiProviderUpdatedAt = now;
            }

            if (request.ClearSmtp)
            {
                record.SmtpPayload = null;
                record.SmtpUpdatedAt = null;
            }
            else if (request.Smtp is not null)
            {
                ValidateSmtp(request.Smtp);
                record.SmtpPayload = Protect(request.Smtp);
                record.SmtpUpdatedAt = now;
            }

            record.UpdatedAt = now;

            await _db.SaveChangesAsync();

            return MapStatus(record);
        }

        private string Protect<T>(T value)
        {
            return _protector.Protect(JsonSerializer.Serialize(value, JsonOptions));
        }

        private static AgencyIntegrationStatusResponse MapStatus(AgencyIntegrationSettingsRecord? record)
        {
            return new AgencyIntegrationStatusResponse
            {
                HasTwilioConfig = !string.IsNullOrWhiteSpace(record?.TwilioPayload),
                TwilioUpdatedAt = record?.TwilioUpdatedAt,
                HasAiProviderConfig = !string.IsNullOrWhiteSpace(record?.AiProviderPayload),
                AiProviderUpdatedAt = record?.AiProviderUpdatedAt,
                HasSmtpConfig = !string.IsNullOrWhiteSpace(record?.SmtpPayload),
                SmtpUpdatedAt = record?.SmtpUpdatedAt,
                UpdatedAt = record?.UpdatedAt,
            };
        }

        private static void ValidateTwilio(TwilioIntegrationWriteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccountSid))
            {
                throw new ArgumentException("Twilio account SID is required.");
            }

            if (string.IsNullOrWhiteSpace(request.AuthToken))
            {
                throw new ArgumentException("Twilio auth token is required.");
            }

            if (string.IsNullOrWhiteSpace(request.FromNumber))
            {
                throw new ArgumentException("Twilio from number is required.");
            }
        }

        private static void ValidateAiProvider(AiProviderIntegrationWriteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.ProviderName))
            {
                throw new ArgumentException("AI provider name is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Model))
            {
                throw new ArgumentException("AI model is required.");
            }

            if (string.IsNullOrWhiteSpace(request.ApiKey))
            {
                throw new ArgumentException("AI API key is required.");
            }
        }

        private static void ValidateSmtp(SmtpIntegrationWriteRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Host))
            {
                throw new ArgumentException("SMTP host is required.");
            }

            if (request.Port <= 0)
            {
                throw new ArgumentException("SMTP port must be greater than zero.");
            }

            if (string.IsNullOrWhiteSpace(request.Username))
            {
                throw new ArgumentException("SMTP username is required.");
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new ArgumentException("SMTP password is required.");
            }

            if (string.IsNullOrWhiteSpace(request.FromEmail))
            {
                throw new ArgumentException("SMTP from email is required.");
            }
        }
    }
}
