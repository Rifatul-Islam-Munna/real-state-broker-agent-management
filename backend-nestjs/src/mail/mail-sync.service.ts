import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MailInboxSyncBackgroundService {
  private readonly logger = new Logger(MailInboxSyncBackgroundService.name);

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleCron() {
    this.logger.debug('Running Mail Inbox Sync Background Service');
  }

  async sync() {
    this.logger.debug('Manual sync triggered');
    return { success: true };
  }

  async getSyncStatus() {
    return { lastSync: new Date(), status: 'Idle' };
  }
}
