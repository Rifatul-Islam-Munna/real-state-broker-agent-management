using System.Net.Http.Headers;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Security;

namespace Services
{
    public class AgencyIntegrationConnectionValidator
    {
        private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(10);

        private readonly IHttpClientFactory _httpClientFactory;

        public AgencyIntegrationConnectionValidator(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        public async Task ValidateCommunicationAsync(CommunicationProviderWriteRequest request, CancellationToken ct = default)
        {
            var providerName = NormalizeProviderName(request.ProviderName, "Twilio");

            if (string.IsNullOrWhiteSpace(request.AccountId))
            {
                throw new ArgumentException($"{providerName} account id is required.");
            }

            if (string.IsNullOrWhiteSpace(request.AuthToken))
            {
                throw new ArgumentException($"{providerName} auth token is required.");
            }

            if (string.IsNullOrWhiteSpace(request.FromNumber))
            {
                throw new ArgumentException("A from number is required for calls and SMS.");
            }

            var validationUrl = providerName.ToLowerInvariant() switch
            {
                "plivo" => BuildUrl(request.BaseUrl, "https://api.plivo.com", $"/v1/Account/{Uri.EscapeDataString(request.AccountId.Trim())}/"),
                "custom" => NormalizeCustomUrl(request.BaseUrl, "A validation URL is required for a custom call/SMS provider."),
                _ => BuildUrl(request.BaseUrl, "https://api.twilio.com", $"/2010-04-01/Accounts/{Uri.EscapeDataString(request.AccountId.Trim())}.json"),
            };

            using var client = _httpClientFactory.CreateClient(nameof(AgencyIntegrationConnectionValidator));
            client.Timeout = DefaultTimeout;

            using var message = new HttpRequestMessage(HttpMethod.Get, validationUrl);
            message.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.ASCII.GetBytes($"{request.AccountId.Trim()}:{request.AuthToken.Trim()}")));

            await EnsureSuccessAsync(client, message, $"{providerName} connection test", ct);
        }

        public async Task ValidateAiProviderAsync(AiWorkspaceWriteRequest request, CancellationToken ct = default)
        {
            var providerName = NormalizeProviderName(request.ProviderName, "OpenAI");

            if (string.IsNullOrWhiteSpace(request.Model))
            {
                throw new ArgumentException("AI model is required.");
            }

            switch (providerName.ToLowerInvariant())
            {
                case "ollama":
                {
                    var baseUrl = NormalizeBaseUrl(request.BaseUrl, "http://localhost:11434");
                    using var client = _httpClientFactory.CreateClient(nameof(AgencyIntegrationConnectionValidator));
                    client.Timeout = DefaultTimeout;
                    using var message = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/api/tags");
                    await EnsureSuccessAsync(client, message, "Ollama connection test", ct);
                    break;
                }
                case "custom":
                {
                    if (string.IsNullOrWhiteSpace(request.BaseUrl))
                    {
                        throw new ArgumentException("Custom AI provider URL is required.");
                    }

                    using var client = _httpClientFactory.CreateClient(nameof(AgencyIntegrationConnectionValidator));
                    client.Timeout = DefaultTimeout;
                    using var message = new HttpRequestMessage(HttpMethod.Get, NormalizeBaseUrl(request.BaseUrl, request.BaseUrl));
                    if (!string.IsNullOrWhiteSpace(request.ApiKey))
                    {
                        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey.Trim());
                    }

                    await EnsureSuccessAsync(client, message, "Custom AI provider connection test", ct);
                    break;
                }
                default:
                {
                    if (string.IsNullOrWhiteSpace(request.ApiKey))
                    {
                        throw new ArgumentException($"{providerName} API key is required.");
                    }

                    var baseUrl = NormalizeBaseUrl(request.BaseUrl, "https://api.openai.com/v1");
                    using var client = _httpClientFactory.CreateClient(nameof(AgencyIntegrationConnectionValidator));
                    client.Timeout = DefaultTimeout;
                    using var message = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/models");
                    message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", request.ApiKey.Trim());
                    await EnsureSuccessAsync(client, message, $"{providerName} connection test", ct);
                    break;
                }
            }
        }

        public async Task ValidateSmtpAsync(MailProviderWriteRequest request, CancellationToken ct = default)
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

            using var client = new TcpClient();
            await client.ConnectAsync(request.Host.Trim(), request.Port, ct).AsTask().WaitAsync(DefaultTimeout, ct);

            await using var networkStream = client.GetStream();
            var stream = (Stream)networkStream;
            SslStream? sslStream = null;

            if (request.UseSsl && request.Port == 465)
            {
                sslStream = new SslStream(stream, false, (_, _, _, errors) => AllowCertificate(request.Host, errors));
                await sslStream.AuthenticateAsClientAsync(request.Host.Trim()).WaitAsync(DefaultTimeout, ct);
                stream = sslStream;
            }

            using var reader = new StreamReader(stream, Encoding.ASCII, leaveOpen: true);
            using var writer = new StreamWriter(stream, Encoding.ASCII, leaveOpen: true)
            {
                AutoFlush = true,
                NewLine = "\r\n",
            };

            await ExpectResponseAsync(reader, ct, 220);
            var ehloResponse = await SendCommandAsync(writer, reader, "EHLO estateblue.local", ct, 250);

            if (request.UseSsl && request.Port != 465)
            {
                if (!ehloResponse.Contains("STARTTLS", StringComparison.OrdinalIgnoreCase))
                {
                    throw new ArgumentException("SMTP server does not advertise STARTTLS for this connection.");
                }

                await SendCommandAsync(writer, reader, "STARTTLS", ct, 220);

                sslStream = new SslStream(stream, false, (_, _, _, errors) => AllowCertificate(request.Host, errors));
                await sslStream.AuthenticateAsClientAsync(request.Host.Trim()).WaitAsync(DefaultTimeout, ct);

                using var secureReader = new StreamReader(sslStream, Encoding.ASCII, leaveOpen: true);
                using var secureWriter = new StreamWriter(sslStream, Encoding.ASCII, leaveOpen: true)
                {
                    AutoFlush = true,
                    NewLine = "\r\n",
                };

                await SendCommandAsync(secureWriter, secureReader, "EHLO estateblue.local", ct, 250);
                await AuthenticateAsync(secureWriter, secureReader, request.Username.Trim(), request.Password.Trim(), ct);
                await SendCommandAsync(secureWriter, secureReader, "QUIT", ct, 221);
                return;
            }

            await AuthenticateAsync(writer, reader, request.Username.Trim(), request.Password.Trim(), ct);
            await SendCommandAsync(writer, reader, "QUIT", ct, 221);
        }

        public async Task ValidateInboxSyncAsync(MailProviderWriteRequest request, CancellationToken ct = default)
        {
            if (!request.EnableInboxSync)
            {
                return;
            }

            var host = (request.ImapHost ?? string.Empty).Trim();
            var username = (request.ImapUsername ?? string.Empty).Trim();
            var password = (request.ImapPassword ?? string.Empty).Trim();
            var folderName = string.IsNullOrWhiteSpace(request.ImapFolder) ? "INBOX" : request.ImapFolder.Trim();

            if (host.Length == 0)
            {
                throw new ArgumentException("Mailbox sync host is required when mailbox sync is enabled.");
            }

            if (request.ImapPort <= 0)
            {
                throw new ArgumentException("Mailbox sync port must be greater than zero.");
            }

            if (username.Length == 0)
            {
                throw new ArgumentException("Mailbox sync username is required when mailbox sync is enabled.");
            }

            if (password.Length == 0)
            {
                throw new ArgumentException("Mailbox sync password is required when mailbox sync is enabled.");
            }

            using var client = new ImapClient();
            client.Timeout = (int)DefaultTimeout.TotalMilliseconds;
            client.ServerCertificateValidationCallback = (_, _, _, errors) =>
                errors == SslPolicyErrors.None || IsLocalHost(host);

            var socketOptions = ResolveSecureSocketOptions(request.ImapPort, request.ImapUseSsl);
            await client.ConnectAsync(host, request.ImapPort, socketOptions, ct).WaitAsync(DefaultTimeout, ct);
            await client.AuthenticateAsync(username, password, ct).WaitAsync(DefaultTimeout, ct);

            IMailFolder folder;
            if (folderName.Equals("INBOX", StringComparison.OrdinalIgnoreCase))
            {
                folder = client.Inbox;
            }
            else if (client.PersonalNamespaces.Count > 0)
            {
                folder = await client.GetFolderAsync(folderName, ct).WaitAsync(DefaultTimeout, ct);
            }
            else
            {
                throw new ArgumentException($"Mailbox folder '{folderName}' could not be resolved on this mailbox.");
            }

            if (folder is null)
            {
                throw new ArgumentException($"Mailbox folder '{folderName}' was not found.");
            }

            await folder.OpenAsync(FolderAccess.ReadWrite, ct).WaitAsync(DefaultTimeout, ct);
            await folder.CloseAsync(false, ct).WaitAsync(DefaultTimeout, ct);
            await client.DisconnectAsync(true, ct).WaitAsync(DefaultTimeout, ct);
        }

        private static async Task AuthenticateAsync(
            StreamWriter writer,
            StreamReader reader,
            string username,
            string password,
            CancellationToken ct)
        {
            await SendCommandAsync(writer, reader, "AUTH LOGIN", ct, 334);
            await SendCommandAsync(writer, reader, Convert.ToBase64String(Encoding.UTF8.GetBytes(username)), ct, 334);
            await SendCommandAsync(writer, reader, Convert.ToBase64String(Encoding.UTF8.GetBytes(password)), ct, 235);
        }

        private static async Task<string> SendCommandAsync(
            StreamWriter writer,
            StreamReader reader,
            string command,
            CancellationToken ct,
            params int[] expectedCodes)
        {
            await writer.WriteLineAsync(command.AsMemory(), ct);
            return await ExpectResponseAsync(reader, ct, expectedCodes);
        }

        private static async Task<string> ExpectResponseAsync(StreamReader reader, CancellationToken ct, params int[] expectedCodes)
        {
            var lines = new List<string>();
            string? firstLine = await reader.ReadLineAsync().WaitAsync(DefaultTimeout, ct);

            if (string.IsNullOrWhiteSpace(firstLine))
            {
                throw new ArgumentException("No response was received from the server.");
            }

            lines.Add(firstLine);

            if (firstLine.Length < 3 || !int.TryParse(firstLine[..3], out var statusCode))
            {
                throw new ArgumentException($"Unexpected server response: {firstLine}");
            }

            while (firstLine.Length > 3 && firstLine[3] == '-')
            {
                var continuation = await reader.ReadLineAsync().WaitAsync(DefaultTimeout, ct)
                    ?? throw new ArgumentException("SMTP server ended the response unexpectedly.");

                lines.Add(continuation);
                firstLine = continuation;
            }

            if (expectedCodes.Length > 0 && !expectedCodes.Contains(statusCode))
            {
                throw new ArgumentException($"Server returned {statusCode}: {string.Join(" | ", lines)}");
            }

            return string.Join("\n", lines);
        }

        private static async Task EnsureSuccessAsync(HttpClient client, HttpRequestMessage message, string actionName, CancellationToken ct)
        {
            using var response = await client.SendAsync(message, ct);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(ct);
                var detail = string.IsNullOrWhiteSpace(body) ? response.ReasonPhrase : body;
                throw new ArgumentException($"{actionName} failed with {(int)response.StatusCode}: {detail}");
            }
        }

        private static string NormalizeProviderName(string? value, string fallback)
        {
            return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
        }

        private static string NormalizeBaseUrl(string? value, string fallback)
        {
            return (string.IsNullOrWhiteSpace(value) ? fallback : value.Trim()).TrimEnd('/');
        }

        private static string BuildUrl(string? baseUrl, string fallbackBaseUrl, string path)
        {
            return $"{NormalizeBaseUrl(baseUrl, fallbackBaseUrl)}{path}";
        }

        private static string NormalizeCustomUrl(string? baseUrl, string errorMessage)
        {
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                throw new ArgumentException(errorMessage);
            }

            return baseUrl.Trim();
        }

        private static bool AllowCertificate(string host, SslPolicyErrors errors)
        {
            return errors == SslPolicyErrors.None || IsLocalHost(host);
        }

        private static bool IsLocalHost(string value)
        {
            var normalized = value.Trim().ToLowerInvariant();
            return normalized is "localhost" or "127.0.0.1" or "::1";
        }

        private static SecureSocketOptions ResolveSecureSocketOptions(int port, bool useSsl)
        {
            if (!useSsl)
            {
                return SecureSocketOptions.None;
            }

            return port == 993 ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTlsWhenAvailable;
        }
    }
}
