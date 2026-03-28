using Data;
using Entities;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Security;
using MailKit.Search;
using Microsoft.EntityFrameworkCore;

namespace Services
{
    public record MailboxSyncStatusResponse(
        bool IsConfigured,
        bool SyncEnabled,
        int? SyncIntervalMinutes,
        bool HasAiProviderConfig,
        bool IsRunning,
        string LastTrigger,
        DateTime? LastStartedAt,
        DateTime? LastCompletedAt,
        DateTime? LastSucceededAt,
        DateTime? NextRunAt,
        int LastImportedCount,
        int LastMatchedLeadCount,
        int LastCreatedLeadCount,
        int LastSkippedCount,
        string? LastError,
        string StatusMessage
    );

    public sealed record MailboxSyncRunResult(
        int ImportedCount,
        int MatchedLeadCount,
        int CreatedLeadCount,
        int SkippedCount
    );

    public class MailboxSyncCoordinator
    {
        private readonly SemaphoreSlim _gate = new(1, 1);
        private readonly object _syncRoot = new();

        private bool _isRunning;
        private string _lastTrigger = "Idle";
        private DateTime? _lastStartedAt;
        private DateTime? _lastCompletedAt;
        private DateTime? _lastSucceededAt;
        private int _lastImportedCount;
        private int _lastMatchedLeadCount;
        private int _lastCreatedLeadCount;
        private int _lastSkippedCount;
        private string? _lastError;

        public async Task<MailboxSyncLease?> TryBeginAsync(string trigger, CancellationToken ct)
        {
            if (!await _gate.WaitAsync(0, ct))
            {
                return null;
            }

            lock (_syncRoot)
            {
                _isRunning = true;
                _lastTrigger = trigger;
                _lastStartedAt = DateTime.UtcNow;
                _lastError = null;
            }

            return new MailboxSyncLease(this);
        }

        public bool IsDue(int intervalMinutes)
        {
            lock (_syncRoot)
            {
                if (_isRunning)
                {
                    return false;
                }

                if (!_lastStartedAt.HasValue)
                {
                    return true;
                }

                return DateTime.UtcNow >= _lastStartedAt.Value.AddMinutes(Math.Clamp(intervalMinutes, 5, 120));
            }
        }

        public MailboxSyncStatusResponse BuildStatus(
            MailProviderWriteRequest? mailConfig,
            bool hasAiProviderConfig)
        {
            lock (_syncRoot)
            {
                var isConfigured = mailConfig is not null;
                var syncEnabled = mailConfig?.EnableInboxSync == true;
                var intervalMinutes = syncEnabled ? Math.Clamp(mailConfig!.SyncIntervalMinutes, 5, 120) : (int?)null;
                DateTime? nextRunAt = syncEnabled && _lastStartedAt.HasValue
                    ? _lastStartedAt.Value.AddMinutes(intervalMinutes ?? 10)
                    : null;

                var statusMessage = !isConfigured
                    ? "Mail is not configured yet."
                    : !syncEnabled
                        ? "Inbox sync is turned off."
                        : hasAiProviderConfig
                            ? "Inbox sync is ready."
                            : "Inbox sync can import mail, but AI extraction is not configured for new sender matching.";

                return new MailboxSyncStatusResponse(
                    isConfigured,
                    syncEnabled,
                    intervalMinutes,
                    hasAiProviderConfig,
                    _isRunning,
                    _lastTrigger,
                    _lastStartedAt,
                    _lastCompletedAt,
                    _lastSucceededAt,
                    nextRunAt,
                    _lastImportedCount,
                    _lastMatchedLeadCount,
                    _lastCreatedLeadCount,
                    _lastSkippedCount,
                    _lastError,
                    statusMessage);
            }
        }

        private void Complete(MailboxSyncRunResult result)
        {
            lock (_syncRoot)
            {
                _isRunning = false;
                _lastCompletedAt = DateTime.UtcNow;
                _lastSucceededAt = _lastCompletedAt;
                _lastImportedCount = result.ImportedCount;
                _lastMatchedLeadCount = result.MatchedLeadCount;
                _lastCreatedLeadCount = result.CreatedLeadCount;
                _lastSkippedCount = result.SkippedCount;
                _lastError = null;
            }

            _gate.Release();
        }

        private void Fail(Exception exception)
        {
            lock (_syncRoot)
            {
                _isRunning = false;
                _lastCompletedAt = DateTime.UtcNow;
                _lastError = exception.Message;
            }

            _gate.Release();
        }

        public sealed class MailboxSyncLease : IDisposable
        {
            private readonly MailboxSyncCoordinator _coordinator;
            private bool _completed;

            public MailboxSyncLease(MailboxSyncCoordinator coordinator)
            {
                _coordinator = coordinator;
            }

            public void Complete(MailboxSyncRunResult result)
            {
                if (_completed)
                {
                    return;
                }

                _completed = true;
                _coordinator.Complete(result);
            }

            public void Fail(Exception exception)
            {
                if (_completed)
                {
                    return;
                }

                _completed = true;
                _coordinator.Fail(exception);
            }

            public void Dispose()
            {
                if (_completed)
                {
                    return;
                }

                _completed = true;
                _coordinator.Fail(new InvalidOperationException("Mailbox sync ended before completion."));
            }
        }
    }

    public class MailInboxSyncService
    {
        private readonly AgencyIntegrationWorkspaceService _agencyIntegrationWorkspaceService;
        private readonly AppDbContext _db;
        private readonly LeadQualificationPredictionService _leadQualificationPredictionService;
        private readonly MailboxLeadIntelligenceService _mailboxLeadIntelligenceService;
        private readonly MailboxSyncCoordinator _mailboxSyncCoordinator;

        public MailInboxSyncService(
            AppDbContext db,
            AgencyIntegrationWorkspaceService agencyIntegrationWorkspaceService,
            LeadQualificationPredictionService leadQualificationPredictionService,
            MailboxLeadIntelligenceService mailboxLeadIntelligenceService,
            MailboxSyncCoordinator mailboxSyncCoordinator)
        {
            _db = db;
            _agencyIntegrationWorkspaceService = agencyIntegrationWorkspaceService;
            _leadQualificationPredictionService = leadQualificationPredictionService;
            _mailboxLeadIntelligenceService = mailboxLeadIntelligenceService;
            _mailboxSyncCoordinator = mailboxSyncCoordinator;
        }

        public async Task<MailboxSyncStatusResponse> GetStatusAsync(CancellationToken ct = default)
        {
            var mailConfig = await _agencyIntegrationWorkspaceService.GetMailProviderConfigAsync(ct);
            var aiConfig = await _agencyIntegrationWorkspaceService.GetAiProviderConfigAsync(ct);
            return _mailboxSyncCoordinator.BuildStatus(mailConfig, aiConfig is not null);
        }

        public async Task<MailboxSyncStatusResponse> RunManualSyncAsync(CancellationToken ct = default)
        {
            await RunSyncAsync("Manual", forceRun: true, ct);
            return await GetStatusAsync(ct);
        }

        public async Task RunScheduledSyncAsync(CancellationToken ct = default)
        {
            await RunSyncAsync("Scheduled", forceRun: false, ct);
        }

        private async Task RunSyncAsync(string trigger, bool forceRun, CancellationToken ct)
        {
            var mailConfig = await _agencyIntegrationWorkspaceService.GetMailProviderConfigAsync(ct);

            if (mailConfig is null || !mailConfig.EnableInboxSync)
            {
                return;
            }

            if (!forceRun && !_mailboxSyncCoordinator.IsDue(mailConfig.SyncIntervalMinutes))
            {
                return;
            }

            using var lease = await _mailboxSyncCoordinator.TryBeginAsync(trigger, ct);
            if (lease is null)
            {
                return;
            }

            try
            {
                var aiConfig = await _agencyIntegrationWorkspaceService.GetAiProviderConfigAsync(ct);
                var result = await SyncInboxAsync(mailConfig, aiConfig, ct);
                lease.Complete(result);
            }
            catch (Exception exception)
            {
                lease.Fail(exception);
                throw;
            }
        }

        private async Task<MailboxSyncRunResult> SyncInboxAsync(
            MailProviderWriteRequest mailConfig,
            AiWorkspaceWriteRequest? aiConfig,
            CancellationToken ct)
        {
            var importedCount = 0;
            var matchedLeadCount = 0;
            var createdLeadCount = 0;
            var skippedCount = 0;
            var propertyCandidates = await _db.Properties
                .AsNoTracking()
                .Include(item => item.Agent)
                .OrderByDescending(item => item.UpdatedAt)
                .ToListAsync(ct);
            var propertyTitles = propertyCandidates
                .Select(item => item.Title)
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .ToList();

            using var client = new ImapClient();
            client.ServerCertificateValidationCallback = (_, _, _, errors) =>
                errors == System.Net.Security.SslPolicyErrors.None || IsLocalHost(mailConfig.ImapHost);

            await client.ConnectAsync(
                mailConfig.ImapHost!.Trim(),
                mailConfig.ImapPort,
                ResolveSecureSocketOptions(mailConfig.ImapPort, mailConfig.ImapUseSsl),
                ct);

            await client.AuthenticateAsync(
                mailConfig.ImapUsername!.Trim(),
                mailConfig.ImapPassword!.Trim(),
                ct);

            var folder = await GetFolderAsync(client, mailConfig.ImapFolder, ct);
            await folder.OpenAsync(FolderAccess.ReadOnly, ct);

            var unseenUids = await folder.SearchAsync(SearchQuery.NotSeen, ct);
            var uidsToProcess = unseenUids
                .TakeLast(Math.Max(mailConfig.MaxMessagesPerSync, 5))
                .ToList();

            foreach (var uid in uidsToProcess)
            {
                var message = await folder.GetMessageAsync(uid, ct);
                var inboundEmail = MapEmail(message);

                if (string.IsNullOrWhiteSpace(inboundEmail.SenderEmail) ||
                    string.IsNullOrWhiteSpace(inboundEmail.Subject) && string.IsNullOrWhiteSpace(inboundEmail.Body))
                {
                    skippedCount++;
                    continue;
                }

                var exists = await _db.MailInbox.AnyAsync(
                    item => item.Email == inboundEmail.SenderEmail &&
                            item.Subject == inboundEmail.Subject &&
                            item.Message == inboundEmail.Body,
                    ct);

                if (exists)
                {
                    skippedCount++;
                    continue;
                }

                var analysis = await _mailboxLeadIntelligenceService.AnalyzeAsync(
                    aiConfig,
                    inboundEmail,
                    propertyTitles,
                    ct);
                var matchedProperty = MatchProperty(propertyCandidates, analysis.PropertyName, inboundEmail);
                var lead = await _db.Leads.FirstOrDefaultAsync(
                    item => item.Email == inboundEmail.SenderEmail,
                    ct);

                if (lead is not null)
                {
                    matchedLeadCount++;
                    ApplyAnalysisToExistingLead(lead, analysis, matchedProperty, message);
                    await SaveMailInboxItemAsync(inboundEmail, message, lead.Id, ct);
                    await _db.SaveChangesAsync(ct);
                    importedCount++;
                    continue;
                }

                if (!analysis.IsPropertyInquiry)
                {
                    await SaveMailInboxItemAsync(inboundEmail, message, null, ct);
                    importedCount++;
                    continue;
                }

                var qualification = await _leadQualificationPredictionService.PredictAsync(
                    BuildLeadSummary(analysis, inboundEmail),
                    budget: string.Empty,
                    analysis.Intent,
                    analysis.Timeline,
                    matchedProperty?.Title ?? analysis.PropertyName,
                    matchedProperty?.Location ?? string.Empty,
                    inboundEmail.SenderEmail,
                    analysis.PhoneNumber,
                    ct);

                var createdLead = new Lead
                {
                    Agent = matchedProperty?.Agent?.FullName ?? string.Empty,
                    Budget = string.Empty,
                    CreatedAt = NormalizeReceivedAt(message.Date),
                    Email = inboundEmail.SenderEmail,
                    InBoard = qualification.InBoard,
                    Interest = analysis.Intent,
                    LastActivityAt = NormalizeReceivedAt(message.Date),
                    Name = ChooseLeadName(analysis.ContactName, inboundEmail),
                    Notes = [],
                    Phone = string.IsNullOrWhiteSpace(analysis.PhoneNumber) ? "Not provided" : analysis.PhoneNumber,
                    Priority = qualification.Priority,
                    Property = matchedProperty?.Title ?? analysis.PropertyName,
                    Source = "Mail Inbox",
                    Stage = qualification.Stage,
                    Summary = BuildLeadSummary(analysis, inboundEmail),
                    Timeline = analysis.Timeline,
                    UpdatedAt = NormalizeReceivedAt(message.Date),
                };

                await _db.Leads.AddAsync(createdLead, ct);
                await _db.SaveChangesAsync(ct);

                await SaveMailInboxItemAsync(inboundEmail, message, createdLead.Id, ct);
                createdLeadCount++;
                importedCount++;
            }

            await folder.CloseAsync(false, ct);
            await client.DisconnectAsync(true, ct);

            return new MailboxSyncRunResult(importedCount, matchedLeadCount, createdLeadCount, skippedCount);
        }

        private static void ApplyAnalysisToExistingLead(
            Lead lead,
            MailboxLeadAnalysis analysis,
            Property? matchedProperty,
            MimeKit.MimeMessage message)
        {
            var activityAt = NormalizeReceivedAt(message.Date);
            lead.LastActivityAt = activityAt;
            lead.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(analysis.Intent))
            {
                lead.Interest = analysis.Intent.Trim();
            }

            if (!string.IsNullOrWhiteSpace(analysis.Timeline))
            {
                lead.Timeline = analysis.Timeline.Trim();
            }

            if (!string.IsNullOrWhiteSpace(analysis.PhoneNumber) &&
                string.IsNullOrWhiteSpace(lead.Phone))
            {
                lead.Phone = analysis.PhoneNumber.Trim();
            }

            if (matchedProperty is not null)
            {
                if (string.IsNullOrWhiteSpace(lead.Property))
                {
                    lead.Property = matchedProperty.Title;
                }

                if (string.IsNullOrWhiteSpace(lead.Agent) && matchedProperty.Agent is not null)
                {
                    lead.Agent = matchedProperty.Agent.FullName;
                }
            }
        }

        private async Task SaveMailInboxItemAsync(
            MailboxInboundEmail inboundEmail,
            MimeKit.MimeMessage message,
            int? leadId,
            CancellationToken ct)
        {
            var receivedAt = NormalizeReceivedAt(message.Date);
            var item = new MailInboxItem
            {
                CreatedAt = receivedAt,
                Email = inboundEmail.SenderEmail,
                Kind = MailInboxKind.Direct,
                LeadId = leadId,
                Message = inboundEmail.Body,
                Name = inboundEmail.SenderName,
                Status = MailInboxStatus.New,
                Subject = inboundEmail.Subject,
                UpdatedAt = receivedAt,
            };

            await _db.MailInbox.AddAsync(item, ct);
            await _db.SaveChangesAsync(ct);
        }

        private static MailboxInboundEmail MapEmail(MimeKit.MimeMessage message)
        {
            var mailbox = message.From.Mailboxes.FirstOrDefault();
            var senderEmail = (mailbox?.Address ?? string.Empty).Trim().ToLowerInvariant();
            var senderName = (mailbox?.Name ?? string.Empty).Trim();
            var subject = (message.Subject ?? string.Empty).Trim();
            var body = ExtractBody(message);

            return new MailboxInboundEmail(senderEmail, senderName, subject, body);
        }

        private static string ExtractBody(MimeKit.MimeMessage message)
        {
            var textBody = (message.TextBody ?? string.Empty).Trim();
            if (textBody.Length > 0)
            {
                return textBody;
            }

            var htmlBody = (message.HtmlBody ?? string.Empty).Trim();
            if (htmlBody.Length == 0)
            {
                return string.Empty;
            }

            var withoutTags = System.Text.RegularExpressions.Regex.Replace(htmlBody, "<[^>]+>", " ");
            return System.Text.RegularExpressions.Regex.Replace(withoutTags, @"\s+", " ").Trim();
        }

        private static async Task<IMailFolder> GetFolderAsync(ImapClient client, string? folderName, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(folderName) || folderName.Trim().Equals("INBOX", StringComparison.OrdinalIgnoreCase))
            {
                return client.Inbox;
            }

            return await client.GetFolderAsync(folderName.Trim(), ct);
        }

        private static SecureSocketOptions ResolveSecureSocketOptions(int port, bool useSsl)
        {
            if (!useSsl)
            {
                return SecureSocketOptions.None;
            }

            return port == 993 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;
        }

        private static DateTime NormalizeReceivedAt(DateTimeOffset receivedAt)
        {
            return receivedAt == default ? DateTime.UtcNow : receivedAt.UtcDateTime;
        }

        private static string ChooseLeadName(string? suggestedName, MailboxInboundEmail inboundEmail)
        {
            if (!string.IsNullOrWhiteSpace(suggestedName))
            {
                return suggestedName.Trim();
            }

            if (!string.IsNullOrWhiteSpace(inboundEmail.SenderName))
            {
                return inboundEmail.SenderName.Trim();
            }

            var localPart = inboundEmail.SenderEmail.Split('@').FirstOrDefault() ?? "Email Lead";
            return localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
        }

        private static string BuildLeadSummary(MailboxLeadAnalysis analysis, MailboxInboundEmail inboundEmail)
        {
            var parts = new List<string>();

            if (!string.IsNullOrWhiteSpace(analysis.Timeline))
            {
                parts.Add($"Timeline: {analysis.Timeline.Trim()}");
            }

            if (!string.IsNullOrWhiteSpace(analysis.Intent))
            {
                parts.Add($"Interest: {analysis.Intent.Trim()}");
            }

            var messageSummary = string.IsNullOrWhiteSpace(analysis.Summary)
                ? BuildHistorySummary(inboundEmail)
                : analysis.Summary.Trim();

            if (!string.IsNullOrWhiteSpace(messageSummary))
            {
                parts.Add($"Message: {messageSummary}");
            }

            return parts.Count == 0 ? "Message: New inbound email inquiry." : string.Join("\n", parts);
        }

        private static string BuildHistorySummary(MailboxInboundEmail inboundEmail)
        {
            if (!string.IsNullOrWhiteSpace(inboundEmail.Subject))
            {
                return inboundEmail.Subject;
            }

            var normalized = (inboundEmail.Body ?? string.Empty).Trim();
            if (normalized.Length <= 180)
            {
                return normalized;
            }

            return normalized[..180].TrimEnd() + "...";
        }

        private static Property? MatchProperty(
            IEnumerable<Property> properties,
            string? requestedPropertyName,
            MailboxInboundEmail inboundEmail)
        {
            var combinedText = $"{requestedPropertyName}\n{inboundEmail.Subject}\n{inboundEmail.Body}".Trim().ToLowerInvariant();
            var requestedName = (requestedPropertyName ?? string.Empty).Trim().ToLowerInvariant();
            return properties
                .Where(item => !string.IsNullOrWhiteSpace(item.Title))
                .OrderByDescending(item => item.Title.Length)
                .FirstOrDefault(item =>
                {
                    var normalizedTitle = item.Title.Trim().ToLowerInvariant();
                    return normalizedTitle.Length > 0 &&
                           (combinedText.Contains(normalizedTitle) ||
                            (requestedName.Length > 0 && normalizedTitle.Contains(requestedName)));
                });
        }

        private static bool IsLocalHost(string? value)
        {
            var normalized = (value ?? string.Empty).Trim().ToLowerInvariant();
            return normalized is "localhost" or "127.0.0.1" or "::1";
        }
    }
}
