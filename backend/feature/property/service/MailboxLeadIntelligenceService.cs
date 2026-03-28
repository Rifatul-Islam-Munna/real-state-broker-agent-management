using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Services
{
    public record MailboxInboundEmail(
        string SenderEmail,
        string SenderName,
        string Subject,
        string Body
    );

    public record MailboxLeadAnalysis(
        bool IsPropertyInquiry,
        string Intent,
        string Timeline,
        string PropertyName,
        string PhoneNumber,
        string ContactName,
        string Summary,
        string Reason
    );

    public class MailboxLeadIntelligenceService
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
        private static readonly Regex PhoneRegex = new(@"(?:\+?\d[\d\-\s\(\)]{7,}\d)", RegexOptions.Compiled);

        private readonly IHttpClientFactory _httpClientFactory;

        public MailboxLeadIntelligenceService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task<MailboxLeadAnalysis> AnalyzeAsync(
            AiWorkspaceWriteRequest? config,
            MailboxInboundEmail email,
            IReadOnlyCollection<string> propertyTitles,
            CancellationToken ct = default)
        {
            if (config is null || string.IsNullOrWhiteSpace(config.Model))
            {
                return AnalyzeFallback(email, propertyTitles);
            }

            try
            {
                var prompt = BuildPrompt(email, propertyTitles);
                var content = await RequestAnalysisContentAsync(config, prompt, ct);
                var parsed = ParseModelResponse(content);
                return NormalizeAnalysis(parsed, email, propertyTitles);
            }
            catch
            {
                return AnalyzeFallback(email, propertyTitles);
            }
        }

        public MailboxLeadAnalysis AnalyzeFallback(
            MailboxInboundEmail email,
            IReadOnlyCollection<string> propertyTitles)
        {
            var combinedText = $"{email.Subject}\n{email.Body}";
            var propertyName = FindPropertyTitle(propertyTitles, combinedText) ?? string.Empty;
            var normalized = Normalize(combinedText);
            var isPropertyInquiry =
                propertyName.Length > 0 ||
                normalized.Contains("property") ||
                normalized.Contains("apartment") ||
                normalized.Contains("house") ||
                normalized.Contains("condo") ||
                normalized.Contains("rent") ||
                normalized.Contains("buy") ||
                normalized.Contains("lease") ||
                normalized.Contains("viewing") ||
                normalized.Contains("visit");

            return new MailboxLeadAnalysis(
                isPropertyInquiry,
                DetectIntent(combinedText),
                DetectTimeline(combinedText),
                propertyName,
                DetectPhone(email.Body),
                string.IsNullOrWhiteSpace(email.SenderName) ? NameFromEmail(email.SenderEmail) : email.SenderName.Trim(),
                BuildSummary(combinedText),
                "Fallback keyword and text matching");
        }

        private async Task<string> RequestAnalysisContentAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var providerName = Normalize(config.ProviderName);
            return providerName switch
            {
                "ollama" => await RequestOllamaAnalysisAsync(config, prompt, ct),
                _ => await RequestOpenAiCompatibleAnalysisAsync(config, prompt, ct),
            };
        }

        private async Task<string> RequestOpenAiCompatibleAnalysisAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var baseUrl = NormalizeBaseUrl(config.BaseUrl, "https://api.openai.com/v1");
            using var client = _httpClientFactory.CreateClient(nameof(MailboxLeadIntelligenceService));
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/chat/completions");
            request.Content = JsonContent.Create(new
            {
                model = config.Model.Trim(),
                temperature = 0.1,
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content = "You extract real-estate lead signals from inbound email. Return only valid JSON."
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                }
            });

            if (!string.IsNullOrWhiteSpace(config.ApiKey))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.ApiKey.Trim());
            }

            using var response = await client.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return document.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?? throw new InvalidOperationException("AI provider returned an empty analysis.");
        }

        private async Task<string> RequestOllamaAnalysisAsync(
            AiWorkspaceWriteRequest config,
            string prompt,
            CancellationToken ct)
        {
            var baseUrl = NormalizeBaseUrl(config.BaseUrl, "http://localhost:11434");
            using var client = _httpClientFactory.CreateClient(nameof(MailboxLeadIntelligenceService));
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{baseUrl}/api/chat");
            request.Content = JsonContent.Create(new
            {
                model = config.Model.Trim(),
                stream = false,
                format = "json",
                messages = new object[]
                {
                    new
                    {
                        role = "system",
                        content = "You extract real-estate lead signals from inbound email. Return only valid JSON."
                    },
                    new
                    {
                        role = "user",
                        content = prompt
                    }
                }
            });

            if (!string.IsNullOrWhiteSpace(config.ApiKey))
            {
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", config.ApiKey.Trim());
            }

            using var response = await client.SendAsync(request, ct);
            response.EnsureSuccessStatusCode();

            using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
            return document.RootElement
                .GetProperty("message")
                .GetProperty("content")
                .GetString()
                ?? throw new InvalidOperationException("Ollama returned an empty analysis.");
        }

        private static string BuildPrompt(MailboxInboundEmail email, IReadOnlyCollection<string> propertyTitles)
        {
            var propertyList = string.Join(", ", propertyTitles.Take(80));
            var builder = new StringBuilder();
            builder.AppendLine("Analyze this inbound email for a real-estate CRM.");
            builder.AppendLine("Return strict JSON with these keys:");
            builder.AppendLine("isPropertyInquiry, intent, timeline, propertyName, phoneNumber, contactName, summary, reason");
            builder.AppendLine("intent should be one short label like Buy Inquiry, Rent Inquiry, Schedule Viewing, Property Information, General Information, or Not Property Related.");
            builder.AppendLine("timeline should be short if present, otherwise empty.");
            builder.AppendLine("propertyName should be the most likely property title if found, otherwise empty.");
            builder.AppendLine("phoneNumber should be the best phone number if present, otherwise empty.");
            builder.AppendLine("summary should be a short CRM-ready summary.");
            builder.AppendLine("If the message is not about buying, renting, viewing, or requesting information about a property, set isPropertyInquiry to false.");
            builder.AppendLine();
            builder.AppendLine($"Known property titles: {propertyList}");
            builder.AppendLine($"Sender name: {email.SenderName}");
            builder.AppendLine($"Sender email: {email.SenderEmail}");
            builder.AppendLine($"Subject: {email.Subject}");
            builder.AppendLine("Body:");
            builder.AppendLine(email.Body);
            return builder.ToString();
        }

        private static MailboxLeadAnalysis NormalizeAnalysis(
            ModelAnalysisResponse response,
            MailboxInboundEmail email,
            IReadOnlyCollection<string> propertyTitles)
        {
            var combinedText = $"{email.Subject}\n{email.Body}";
            var propertyName = response.PropertyName?.Trim() ?? string.Empty;
            var matchedProperty = FindPropertyTitle(propertyTitles, propertyName) ?? FindPropertyTitle(propertyTitles, combinedText) ?? propertyName;
            var phoneNumber = NormalizePhone(response.PhoneNumber) ?? DetectPhone(email.Body);
            var contactName = string.IsNullOrWhiteSpace(response.ContactName)
                ? (string.IsNullOrWhiteSpace(email.SenderName) ? NameFromEmail(email.SenderEmail) : email.SenderName.Trim())
                : response.ContactName.Trim();
            var summary = string.IsNullOrWhiteSpace(response.Summary)
                ? BuildSummary(combinedText)
                : response.Summary.Trim();
            var intent = string.IsNullOrWhiteSpace(response.Intent)
                ? DetectIntent(combinedText)
                : response.Intent.Trim();
            var timeline = string.IsNullOrWhiteSpace(response.Timeline)
                ? DetectTimeline(combinedText)
                : response.Timeline.Trim();
            var isPropertyInquiry = response.IsPropertyInquiry || matchedProperty.Length > 0;

            return new MailboxLeadAnalysis(
                isPropertyInquiry,
                intent,
                timeline,
                matchedProperty,
                phoneNumber,
                contactName,
                summary,
                string.IsNullOrWhiteSpace(response.Reason) ? "AI lead extraction" : response.Reason.Trim());
        }

        private static ModelAnalysisResponse ParseModelResponse(string content)
        {
            var json = ExtractJson(content);
            return JsonSerializer.Deserialize<ModelAnalysisResponse>(json, JsonOptions)
                ?? new ModelAnalysisResponse();
        }

        private static string ExtractJson(string content)
        {
            var start = content.IndexOf('{');
            var end = content.LastIndexOf('}');

            if (start < 0 || end <= start)
            {
                return "{}";
            }

            return content[start..(end + 1)];
        }

        private static string BuildSummary(string content)
        {
            var normalized = Regex.Replace(content, @"\s+", " ").Trim();
            if (normalized.Length <= 260)
            {
                return normalized;
            }

            return normalized[..260].TrimEnd() + "...";
        }

        private static string DetectIntent(string content)
        {
            var normalized = Normalize(content);

            if (normalized.Contains("schedule viewing") || normalized.Contains("schedule a viewing") || normalized.Contains("book a tour") || normalized.Contains("visit"))
            {
                return "Schedule Viewing";
            }

            if (normalized.Contains("rent") || normalized.Contains("lease"))
            {
                return "Rent Inquiry";
            }

            if (normalized.Contains("buy") || normalized.Contains("purchase"))
            {
                return "Buy Inquiry";
            }

            if (normalized.Contains("information") || normalized.Contains("details") || normalized.Contains("availability"))
            {
                return "Property Information";
            }

            return "General Information";
        }

        private static string DetectTimeline(string content)
        {
            var normalized = Normalize(content);

            if (normalized.Contains("this month"))
            {
                return "This Month";
            }

            if (normalized.Contains("this week"))
            {
                return "This Week";
            }

            if (normalized.Contains("next month"))
            {
                return "Next Month";
            }

            if (normalized.Contains("asap") || normalized.Contains("urgent") || normalized.Contains("immediately"))
            {
                return "Immediate";
            }

            return string.Empty;
        }

        private static string DetectPhone(string content)
        {
            var match = PhoneRegex.Match(content ?? string.Empty);
            return match.Success ? NormalizePhone(match.Value) ?? string.Empty : string.Empty;
        }

        private static string? NormalizePhone(string? value)
        {
            var normalized = Regex.Replace(value ?? string.Empty, @"[^\d\+]", string.Empty).Trim();
            return normalized.Length >= 8 ? normalized : null;
        }

        private static string NameFromEmail(string email)
        {
            var localPart = (email ?? string.Empty).Split('@').FirstOrDefault() ?? string.Empty;
            var readable = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
            return readable.Length == 0 ? "Email Lead" : readable;
        }

        private static string? FindPropertyTitle(IEnumerable<string> propertyTitles, string source)
        {
            var normalizedSource = Normalize(source);
            if (normalizedSource.Length == 0)
            {
                return null;
            }

            var matches = propertyTitles
                .Where(title => !string.IsNullOrWhiteSpace(title))
                .Select(title => title.Trim())
                .Where(title =>
                {
                    var normalizedTitle = Normalize(title);
                    return normalizedTitle.Length > 0 &&
                           (normalizedSource.Contains(normalizedTitle) || normalizedTitle.Contains(normalizedSource));
                })
                .OrderByDescending(title => title.Length)
                .ToList();

            return matches.FirstOrDefault();
        }

        private static string Normalize(string? value)
        {
            return (value ?? string.Empty).Trim().ToLowerInvariant();
        }

        private static string NormalizeBaseUrl(string? value, string fallback)
        {
            return (string.IsNullOrWhiteSpace(value) ? fallback : value.Trim()).TrimEnd('/');
        }

        private sealed class ModelAnalysisResponse
        {
            public bool IsPropertyInquiry { get; set; }
            public string? Intent { get; set; }
            public string? Timeline { get; set; }
            public string? PropertyName { get; set; }
            public string? PhoneNumber { get; set; }
            public string? ContactName { get; set; }
            public string? Summary { get; set; }
            public string? Reason { get; set; }
        }
    }
}
