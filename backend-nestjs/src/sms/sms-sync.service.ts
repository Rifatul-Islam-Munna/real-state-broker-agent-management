import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SmsService } from './sms.service';

@Injectable()
export class SmsSyncService {
  private readonly logger = new Logger(SmsSyncService.name);

  constructor(private readonly smsService: SmsService) {}

  @Cron('*/1 * * * *')
  async syncMessages() {
    try {
      const result = await this.smsService.syncProviderMessages();
      if (result.imported) this.logger.log(`Imported ${result.imported} SMS messages`);
    } catch (error: any) {
      this.logger.warn(`SMS sync failed: ${error.message}`);
    }
  }
}
