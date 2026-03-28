using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Services
{
    public class MailInboxSyncBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;

        public MailInboxSyncBackgroundService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunScheduledSyncAsync(stoppingToken);
                }
                catch
                {
                    // The sync service keeps the last error in shared runtime status.
                }

                if (!await timer.WaitForNextTickAsync(stoppingToken))
                {
                    break;
                }
            }
        }

        private async Task RunScheduledSyncAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var syncService = scope.ServiceProvider.GetRequiredService<MailInboxSyncService>();
            await syncService.RunScheduledSyncAsync(ct);
        }
    }
}
