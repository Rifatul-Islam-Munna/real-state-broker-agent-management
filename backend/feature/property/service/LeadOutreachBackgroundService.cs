using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Services
{
    public class LeadOutreachBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;

        public LeadOutreachBackgroundService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(LeadOutreachService.GetProcessInterval());

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var outreachService = scope.ServiceProvider.GetRequiredService<LeadOutreachService>();
                    await outreachService.ProcessDueScheduledAsync(stoppingToken);
                }
                catch
                {
                    // Keep the scheduler alive; failures are reflected on the history entry itself.
                }

                if (!await timer.WaitForNextTickAsync(stoppingToken))
                {
                    break;
                }
            }
        }
    }
}
