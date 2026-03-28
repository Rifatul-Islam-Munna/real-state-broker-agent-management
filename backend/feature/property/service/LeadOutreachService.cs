using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Encodings.Web;
using Data;
using Entities;
using MailKit.Net.Smtp;
using Microsoft.EntityFrameworkCore;
using MimeKit;

namespace Services
{
    public class LeadOutreachDispatchRequest
    {
        public int LeadId { get; set; }
        public LeadHistoryKind Kind { get; set; } = LeadHistoryKind.Email;
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime? ScheduledAt { get; set; }
    }

    public record LeadOutreachScheduleResponse(
        int Id,
        int LeadId,
        string LeadName,
        string LeadEmail,
        string LeadPhone,
        LeadHistoryKind Kind,
        LeadHistoryDirection Direction,
        LeadHistoryStatus Status,
        string Title,
        string Summary,
        string Body,
        string Provider,
        string CreatedBy,
        DateTime? ScheduledAt,
        DateTime? OccurredAt,
        DateTime CreatedAt,
        DateTime UpdatedAt
    );

    internal sealed record LeadOutreachDeliveryResult(
        LeadHistoryStatus Status,
        string Provider,
        string Summary,
        string? ExternalReference = null,
        string? ErrorMessage = null
    );

    public class LeadOutreachService
    {
        private static readonly TimeSpan ProcessInterval = TimeSpan.FromMinutes(1);
        private static readonly SemaphoreSlim DispatchGate = new(1, 1);

        private readonly AgencyIntegrationWorkspaceService _agencyIntegrationWorkspaceService;
        private readonly AppDbContext _db;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly LeadHistoryService _leadHistoryService;

        public LeadOutreachService(
            AppDbContext db,
            IHttpClientFactory httpClientFactory,
            AgencyIntegrationWorkspaceService agencyIntegrationWorkspaceService,
            LeadHistoryService leadHistoryService)
        {
            _db = db;
            _httpClientFactory = httpClientFactory;
            _agencyIntegrationWorkspaceService = agencyIntegrationWorkspaceService;
            _leadHistoryService = leadHistoryService;
        }

        public async Task<LeadHistoryEntryResponse> DispatchAsync(
            LeadOutreachDispatchRequest request,
            CancellationToken ct = default)
        {
            ValidateDispatchRequest(request);

            var lead = await _db.Leads.FirstOrDefaultAsync(item => item.Id == request.LeadId, ct)
                ?? throw new InvalidOperationException("Lead was not found.");

            var normalizedTitle = NormalizeOptional(request.Title)
                ?? request.Kind switch
                {
                    LeadHistoryKind.Call => "Lead call",
                    LeadHistoryKind.Sms => "Lead SMS",
                    _ => "Lead email",
                };
            var normalizedMessage = request.Message.Trim();
            var createdBy = NormalizeOptional(request.CreatedBy) ?? "CRM";
            var scheduledAt = request.ScheduledAt?.ToUniversalTime();
            var shouldSchedule = scheduledAt.HasValue && scheduledAt.Value > DateTime.UtcNow.AddSeconds(30);

            if (shouldSchedule)
            {
                var dueAt = scheduledAt ?? DateTime.UtcNow;
                var scheduledSummary = BuildScheduledSummary(lead, request.Kind, dueAt);
                return await _leadHistoryService.CreateAsync(new CreateLeadHistoryEntryInput
                {
                    Body = normalizedMessage,
                    CreatedBy = createdBy,
                    Direction = LeadHistoryDirection.Scheduled,
                    Kind = request.Kind,
                    LeadId = lead.Id,
                    Provider = await ResolveProviderNameAsync(request.Kind, ct),
                    ScheduledAt = dueAt,
                    Status = LeadHistoryStatus.Scheduled,
                    Summary = scheduledSummary,
                    Title = normalizedTitle,
                }, ct);
            }

            var occurredAt = DateTime.UtcNow;
            LeadOutreachDeliveryResult delivery;

            try
            {
                delivery = await DeliverAsync(lead, request.Kind, normalizedTitle, normalizedMessage, ct);
            }
            catch (Exception ex)
            {
                delivery = new LeadOutreachDeliveryResult(
                    LeadHistoryStatus.Failed,
                    await ResolveProviderNameAsync(request.Kind, ct),
                    ex.Message,
                    ErrorMessage: ex.Message);
            }

            var response = await _leadHistoryService.CreateAsync(new CreateLeadHistoryEntryInput
            {
                Body = normalizedMessage,
                CreatedBy = createdBy,
                Direction = LeadHistoryDirection.Outgoing,
                Kind = request.Kind,
                LeadId = lead.Id,
                OccurredAt = occurredAt,
                Provider = delivery.Provider,
                Status = delivery.Status,
                Summary = delivery.Summary,
                Title = delivery.Status == LeadHistoryStatus.Failed
                    ? $"{normalizedTitle} failed"
                    : normalizedTitle,
            }, ct);

            if (delivery.Status is LeadHistoryStatus.Sent or LeadHistoryStatus.Completed)
            {
                await PromoteLeadAfterOutreachAsync(lead.Id, ct);
            }

            return response;
        }

        public async Task<List<LeadOutreachScheduleResponse>> GetScheduleAsync(
            int? leadId = null,
            LeadHistoryKind? kind = null,
            LeadHistoryStatus? status = null,
            CancellationToken ct = default)
        {
            var query = _db.LeadHistoryEntries
                .AsNoTracking()
                .Join(
                    _db.Leads.AsNoTracking(),
                    history => history.LeadId,
                    lead => lead.Id,
                    (history, lead) => new LeadOutreachScheduleResponse(
                        history.Id,
                        lead.Id,
                        lead.Name,
                        lead.Email,
                        lead.Phone,
                        history.Kind,
                        history.Direction,
                        history.Status,
                        history.Title,
                        history.Summary,
                        history.Body,
                        history.Provider,
                        history.CreatedBy,
                        history.ScheduledAt,
                        history.OccurredAt,
                        history.CreatedAt,
                        history.UpdatedAt
                    ))
                .Where(item =>
                    (item.Kind == LeadHistoryKind.Email ||
                     item.Kind == LeadHistoryKind.Sms ||
                     item.Kind == LeadHistoryKind.Call) &&
                    (item.Direction == LeadHistoryDirection.Scheduled || item.ScheduledAt != null));

            if (leadId.HasValue)
            {
                query = query.Where(item => item.LeadId == leadId.Value);
            }

            if (kind.HasValue)
            {
                query = query.Where(item => item.Kind == kind.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(item => item.Status == status.Value);
            }

            return await query
                .OrderBy(item => item.Status == LeadHistoryStatus.Scheduled ? 0 : 1)
                .ThenBy(item => item.ScheduledAt ?? item.CreatedAt)
                .ThenBy(item => item.Id)
                .ToListAsync(ct);
        }

        public async Task ProcessDueScheduledAsync(CancellationToken ct = default)
        {
            if (!await DispatchGate.WaitAsync(0, ct))
            {
                return;
            }

            try
            {
                var now = DateTime.UtcNow;
                var dueEntries = await _db.LeadHistoryEntries
                    .Include(item => item.Lead)
                    .Where(item =>
                        item.Status == LeadHistoryStatus.Scheduled &&
                        item.ScheduledAt != null &&
                        item.ScheduledAt <= now &&
                        (item.Kind == LeadHistoryKind.Email ||
                         item.Kind == LeadHistoryKind.Sms ||
                         item.Kind == LeadHistoryKind.Call))
                    .OrderBy(item => item.ScheduledAt)
                    .Take(25)
                    .ToListAsync(ct);

                foreach (var entry in dueEntries)
                {
                    if (entry.Lead is null)
                    {
                        entry.Status = LeadHistoryStatus.Failed;
                        entry.Summary = "Lead record is missing for this scheduled outreach.";
                        entry.UpdatedAt = now;
                        continue;
                    }

                    LeadOutreachDeliveryResult delivery;
                    try
                    {
                        delivery = await DeliverAsync(entry.Lead, entry.Kind, entry.Title, entry.Body, ct);
                    }
                    catch (Exception ex)
                    {
                        delivery = new LeadOutreachDeliveryResult(
                            LeadHistoryStatus.Failed,
                            await ResolveProviderNameAsync(entry.Kind, ct),
                            ex.Message,
                            ErrorMessage: ex.Message);
                    }

                    entry.Status = delivery.Status;
                    entry.Provider = delivery.Provider;
                    entry.Summary = delivery.Summary;
                    entry.OccurredAt = now;
                    entry.UpdatedAt = now;

                    if (delivery.Status is LeadHistoryStatus.Sent or LeadHistoryStatus.Completed)
                    {
                        await PromoteLeadAfterOutreachAsync(entry.Lead.Id, ct);
                    }
                }

                await _db.SaveChangesAsync(ct);
            }
            finally
            {
                DispatchGate.Release();
            }
        }

        public async Task<string?> BuildCallScriptAsync(int historyEntryId, string? providerName, CancellationToken ct = default)
        {
            var entry = await _db.LeadHistoryEntries
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.Id == historyEntryId && item.Kind == LeadHistoryKind.Call, ct);

            if (entry is null)
            {
                return null;
            }

            var message = string.IsNullOrWhiteSpace(entry.Body)
                ? (string.IsNullOrWhiteSpace(entry.Summary) ? entry.Title : entry.Summary)
                : entry.Body;
            var safeMessage = HtmlEncoder.Default.Encode(message);
            var normalizedProvider = (providerName ?? string.Empty).Trim().ToLowerInvariant();

            if (normalizedProvider == "plivo")
            {
                return $"<Response><Speak>{safeMessage}</Speak></Response>";
            }

            return $"<Response><Say>{safeMessage}</Say></Response>";
        }

        public static TimeSpan GetProcessInterval() => ProcessInterval;

        private async Task<LeadOutreachDeliveryResult> DeliverAsync(
            Lead lead,
            LeadHistoryKind kind,
            string title,
            string message,
            CancellationToken ct)
        {
            return kind switch
            {
                LeadHistoryKind.Email => await SendEmailAsync(lead, title, message, ct),
                LeadHistoryKind.Sms => await SendSmsAsync(lead, message, ct),
                LeadHistoryKind.Call => await TriggerCallAsync(lead, title, message, ct),
                _ => throw new ArgumentException("Only email, SMS, and call outreach are supported."),
            };
        }

        private async Task<LeadOutreachDeliveryResult> SendEmailAsync(
            Lead lead,
            string subject,
            string message,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(lead.Email))
            {
                return new LeadOutreachDeliveryResult(
                    LeadHistoryStatus.Failed,
                    "SMTP Mail",
                    "Email delivery failed because the lead does not have an email address.",
                    ErrorMessage: "Lead email is missing.");
            }

            var mailConfig = await _agencyIntegrationWorkspaceService.GetMailProviderConfigAsync(ct)
                ?? throw new ArgumentException("SMTP mail is not configured yet.");

            var emailMessage = new MimeMessage();
            emailMessage.From.Add(new MailboxAddress(
                string.IsNullOrWhiteSpace(mailConfig.FromName) ? mailConfig.FromEmail : mailConfig.FromName,
                mailConfig.FromEmail));
            emailMessage.To.Add(MailboxAddress.Parse(lead.Email));
            emailMessage.Subject = subject;
            emailMessage.Body = new TextPart("plain")
            {
                Text = message,
            };

            using var client = new SmtpClient();
            client.Timeout = 15000;

            await client.ConnectAsync(
                mailConfig.Host.Trim(),
                mailConfig.Port,
                ResolveSmtpSecureSocketOptions(mailConfig.Port, mailConfig.UseSsl),
                ct);

            await client.AuthenticateAsync(mailConfig.Username.Trim(), mailConfig.Password.Trim(), ct);
            await client.SendAsync(emailMessage, ct);
            await client.DisconnectAsync(true, ct);

            var provider = string.IsNullOrWhiteSpace(mailConfig.ProviderName) ? "SMTP Mail" : mailConfig.ProviderName.Trim();
            return new LeadOutreachDeliveryResult(
                LeadHistoryStatus.Sent,
                provider,
                $"Email sent to {lead.Email} via {provider}.");
        }

        private async Task<LeadOutreachDeliveryResult> SendSmsAsync(
            Lead lead,
            string message,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(lead.Phone))
            {
                return new LeadOutreachDeliveryResult(
                    LeadHistoryStatus.Failed,
                    "CRM SMS",
                    "SMS delivery failed because the lead does not have a phone number.",
                    ErrorMessage: "Lead phone is missing.");
            }

            var communicationConfig = await _agencyIntegrationWorkspaceService.GetCommunicationConfigAsync(ct)
                ?? throw new ArgumentException("Communication provider is not configured yet.");

            if (!communicationConfig.SupportsSms)
            {
                throw new ArgumentException($"{communicationConfig.ProviderName} is saved without SMS support.");
            }

            var providerName = NormalizeProvider(communicationConfig.ProviderName, "Twilio");

            switch (providerName.ToLowerInvariant())
            {
                case "plivo":
                    await SendPlivoSmsAsync(communicationConfig, lead.Phone, message, ct);
                    break;
                case "custom":
                    await SendCustomSmsAsync(communicationConfig, lead.Phone, message, ct);
                    break;
                default:
                    await SendTwilioSmsAsync(communicationConfig, lead.Phone, message, ct);
                    break;
            }

            return new LeadOutreachDeliveryResult(
                LeadHistoryStatus.Sent,
                providerName,
                $"SMS sent to {lead.Phone} via {providerName}.");
        }

        private async Task<LeadOutreachDeliveryResult> TriggerCallAsync(
            Lead lead,
            string title,
            string message,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(lead.Phone))
            {
                return new LeadOutreachDeliveryResult(
                    LeadHistoryStatus.Failed,
                    "CRM Call",
                    "Call could not be triggered because the lead does not have a phone number.",
                    ErrorMessage: "Lead phone is missing.");
            }

            var communicationConfig = await _agencyIntegrationWorkspaceService.GetCommunicationConfigAsync(ct)
                ?? throw new ArgumentException("Communication provider is not configured yet.");

            if (!communicationConfig.SupportsVoice)
            {
                throw new ArgumentException($"{communicationConfig.ProviderName} is saved without voice support.");
            }

            var providerName = NormalizeProvider(communicationConfig.ProviderName, "Twilio");

            switch (providerName.ToLowerInvariant())
            {
                case "plivo":
                    await SendPlivoCallAsync(communicationConfig, lead.Phone, title, message, ct);
                    break;
                case "custom":
                    await SendCustomCallAsync(communicationConfig, lead.Phone, title, message, ct);
                    break;
                default:
                    await SendTwilioCallAsync(communicationConfig, lead.Phone, message, ct);
                    break;
            }

            return new LeadOutreachDeliveryResult(
                LeadHistoryStatus.Completed,
                providerName,
                $"Call triggered to {lead.Phone} via {providerName}.");
        }

        private async Task SendTwilioSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["To"] = targetPhone,
                ["From"] = config.FromNumber.Trim(),
                ["Body"] = message,
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/2010-04-01/Accounts/{Uri.EscapeDataString(config.AccountId.Trim())}/Messages.json"),
                content,
                ct);
        }

        private async Task SendTwilioCallAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            using var content = new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["To"] = targetPhone,
                ["From"] = config.FromNumber.Trim(),
                ["Twiml"] = $"<Response><Say>{SecurityElementEscape(message)}</Say></Response>",
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/2010-04-01/Accounts/{Uri.EscapeDataString(config.AccountId.Trim())}/Calls.json"),
                content,
                ct);
        }

        private async Task SendPlivoSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            using var content = JsonContent.Create(new
            {
                src = config.FromNumber.Trim(),
                dst = targetPhone,
                text = message,
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/v1/Account/{Uri.EscapeDataString(config.AccountId.Trim())}/Message/"),
                content,
                ct);
        }

        private async Task SendPlivoCallAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string title,
            string message,
            CancellationToken ct)
        {
            var webhookUrl = NormalizeOptional(config.VoiceWebhookUrl)
                ?? throw new ArgumentException("Add a public voice webhook URL before triggering Plivo calls.");

            var answerUrl = $"{webhookUrl}{(webhookUrl.Contains('?') ? "&" : "?")}message={Uri.EscapeDataString(message)}&title={Uri.EscapeDataString(title)}&provider=plivo";

            using var content = JsonContent.Create(new
            {
                from = config.FromNumber.Trim(),
                to = targetPhone,
                answer_url = answerUrl,
                answer_method = "GET",
            });

            await SendProviderRequestAsync(
                config,
                HttpMethod.Post,
                BuildProviderUrl(config, $"/v1/Account/{Uri.EscapeDataString(config.AccountId.Trim())}/Call/"),
                content,
                ct);
        }

        private async Task SendCustomSmsAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string message,
            CancellationToken ct)
        {
            var baseUrl = NormalizeOptional(config.BaseUrl)
                ?? throw new ArgumentException("A custom SMS endpoint is required for the custom communication provider.");

            using var content = JsonContent.Create(new
            {
                accountId = config.AccountId.Trim(),
                from = config.FromNumber.Trim(),
                to = targetPhone,
                body = message,
            });

            await SendProviderRequestAsync(config, HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/messages", content, ct);
        }

        private async Task SendCustomCallAsync(
            CommunicationProviderWriteRequest config,
            string targetPhone,
            string title,
            string message,
            CancellationToken ct)
        {
            var baseUrl = NormalizeOptional(config.BaseUrl)
                ?? throw new ArgumentException("A custom call endpoint is required for the custom communication provider.");

            using var content = JsonContent.Create(new
            {
                accountId = config.AccountId.Trim(),
                from = config.FromNumber.Trim(),
                to = targetPhone,
                title,
                message,
            });

            await SendProviderRequestAsync(config, HttpMethod.Post, $"{baseUrl.TrimEnd('/')}/calls", content, ct);
        }

        private async Task SendProviderRequestAsync(
            CommunicationProviderWriteRequest config,
            HttpMethod method,
            string url,
            HttpContent content,
            CancellationToken ct)
        {
            using var client = _httpClientFactory.CreateClient(nameof(LeadOutreachService));
            client.Timeout = TimeSpan.FromSeconds(20);

            using var request = new HttpRequestMessage(method, url)
            {
                Content = content,
            };

            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.ASCII.GetBytes($"{config.AccountId.Trim()}:{config.AuthToken.Trim()}")));

            using var response = await client.SendAsync(request, ct);
            if (response.IsSuccessStatusCode)
            {
                return;
            }

            var detail = await response.Content.ReadAsStringAsync(ct);
            throw new ArgumentException(
                $"Communication provider returned {(int)response.StatusCode}: {(string.IsNullOrWhiteSpace(detail) ? response.ReasonPhrase : detail)}");
        }

        private async Task PromoteLeadAfterOutreachAsync(int leadId, CancellationToken ct)
        {
            var lead = await _db.Leads.FirstOrDefaultAsync(item => item.Id == leadId, ct);
            if (lead is null)
            {
                return;
            }

            var now = DateTime.UtcNow;
            lead.LastActivityAt = now;
            lead.UpdatedAt = now;

            if (lead.Stage == LeadStage.New)
            {
                lead.Stage = LeadStage.Contacted;
                lead.InBoard = true;
            }

            await _db.SaveChangesAsync(ct);
        }

        private async Task<string> ResolveProviderNameAsync(LeadHistoryKind kind, CancellationToken ct)
        {
            if (kind == LeadHistoryKind.Email)
            {
                var mail = await _agencyIntegrationWorkspaceService.GetMailProviderConfigAsync(ct);
                return NormalizeProvider(mail?.ProviderName, "SMTP Mail");
            }

            var communication = await _agencyIntegrationWorkspaceService.GetCommunicationConfigAsync(ct);
            return NormalizeProvider(communication?.ProviderName, "CRM Outreach");
        }

        private static string BuildScheduledSummary(Lead lead, LeadHistoryKind kind, DateTime scheduledAt)
        {
            var target = kind == LeadHistoryKind.Email
                ? lead.Email
                : lead.Phone;
            var label = kind == LeadHistoryKind.Call ? "Call" : kind == LeadHistoryKind.Sms ? "SMS" : "Email";
            return $"{label} scheduled for {scheduledAt:u} to {(string.IsNullOrWhiteSpace(target) ? "the lead" : target)}.";
        }

        private static void ValidateDispatchRequest(LeadOutreachDispatchRequest request)
        {
            if (request.LeadId <= 0)
            {
                throw new ArgumentException("Lead id is required.");
            }

            if (request.Kind is not LeadHistoryKind.Email and not LeadHistoryKind.Sms and not LeadHistoryKind.Call)
            {
                throw new ArgumentException("Only email, SMS, and call outreach are supported.");
            }

            if (string.IsNullOrWhiteSpace(request.Message))
            {
                throw new ArgumentException("Add a message before sending or scheduling outreach.");
            }

            if (request.Kind == LeadHistoryKind.Email && string.IsNullOrWhiteSpace(request.Title))
            {
                throw new ArgumentException("Email subject is required.");
            }
        }

        private static MailKit.Security.SecureSocketOptions ResolveSmtpSecureSocketOptions(int port, bool useSsl)
        {
            if (!useSsl)
            {
                return MailKit.Security.SecureSocketOptions.None;
            }

            return port == 465
                ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : MailKit.Security.SecureSocketOptions.StartTlsWhenAvailable;
        }

        private static string BuildProviderUrl(CommunicationProviderWriteRequest config, string path)
        {
            var baseUrl = NormalizeOptional(config.BaseUrl);
            var fallbackBaseUrl = NormalizeProvider(config.ProviderName, "Twilio").ToLowerInvariant() switch
            {
                "plivo" => "https://api.plivo.com",
                "custom" => baseUrl ?? string.Empty,
                _ => "https://api.twilio.com",
            };

            var root = (baseUrl ?? fallbackBaseUrl).TrimEnd('/');
            return $"{root}{path}";
        }

        private static string NormalizeProvider(string? value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static string? NormalizeOptional(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }

        private static string SecurityElementEscape(string value)
        {
            return value
                .Replace("&", "&amp;", StringComparison.Ordinal)
                .Replace("<", "&lt;", StringComparison.Ordinal)
                .Replace(">", "&gt;", StringComparison.Ordinal)
                .Replace("\"", "&quot;", StringComparison.Ordinal)
                .Replace("'", "&apos;", StringComparison.Ordinal);
        }
    }
}
