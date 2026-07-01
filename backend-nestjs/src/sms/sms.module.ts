import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsSyncService } from './sms-sync.service';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([SmsMessage, Lead, LeadHistoryEntry]), SettingsModule],
  controllers: [SmsController],
  providers: [SmsService, SmsSyncService],
  exports: [SmsService],
})
export class SmsModule {}
