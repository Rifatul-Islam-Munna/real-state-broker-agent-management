namespace Services
{
    public class PropertyFeedbackBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;

        public PropertyFeedbackBackgroundService(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(10));

            while (!stoppingToken.IsCancellationRequested &&
                   await timer.WaitForNextTickAsync(stoppingToken))
            {
                using var scope = _serviceProvider.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<PropertyFeedbackService>();
                await service.ProcessDueAsync(stoppingToken);
            }
        }
    }
}
