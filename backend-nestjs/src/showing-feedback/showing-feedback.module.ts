import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { Property } from '../properties/entities/property.entity';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { SettingsModule } from '../settings/settings.module';
import { SmsModule } from '../sms/sms.module';
import { ShowingFeedback } from './entities/showing-feedback.entity';
import { ShowingFeedbackAutomationService } from './showing-feedback-automation.service';
import { ShowingFeedbackEntryService } from './showing-feedback-entry.service';
import { ShowingFeedbackQueryService } from './showing-feedback-query.service';
import { ShowingFeedbackService } from './showing-feedback.service';
import { ShowingFeedbackV2Controller } from './showing-feedback-v2.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShowingFeedback, RealtorShowing, Property, LeadHistoryEntry]),
    SettingsModule,
    forwardRef(() => SmsModule),
  ],
  controllers: [ShowingFeedbackV2Controller],
  providers: [
    ShowingFeedbackService,
    ShowingFeedbackQueryService,
    ShowingFeedbackEntryService,
    ShowingFeedbackAutomationService,
  ],
  exports: [ShowingFeedbackService],
})
export class ShowingFeedbackModule {}
