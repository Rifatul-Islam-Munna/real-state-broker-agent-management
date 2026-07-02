import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsMessage } from './entities/sms-message.entity';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { SmsSyncService } from './sms-sync.service';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { SettingsModule } from '../settings/settings.module';
import { ShowingFeedbackModule } from '../showing-feedback/showing-feedback.module';

@Module({
  imports: [TypeOrmModule.forFeature([SmsMessage, Lead, LeadHistoryEntry]), SettingsModule, forwardRef(() => ShowingFeedbackModule)],
  controllers: [SmsController],
  providers: [SmsService, SmsSyncService],
  exports: [SmsService],
})
export class SmsModule {}
