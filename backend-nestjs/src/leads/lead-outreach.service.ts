import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class LeadOutreachBackgroundService {
  private readonly logger = new Logger(LeadOutreachBackgroundService.name);

  @Cron(CronExpression.EVERY_HOUR)
  handleCron() {
    this.logger.debug('Running Lead Outreach Background Service');
  }
}
