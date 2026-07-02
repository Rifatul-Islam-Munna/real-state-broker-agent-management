import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { Property } from '../properties/entities/property.entity';
import { RealtorShowing } from '../realtor-showings/entities/realtor-showing.entity';
import { SettingsModule } from '../settings/settings.module';
import { SmsModule } from '../sms/sms.module';
import { ShowingFeedback } from './entities/showing-feedback.entity';
import { ShowingFeedbackController } from './showing-feedback.controller';
import { ShowingFeedbackService } from './showing-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShowingFeedback, RealtorShowing, Property, LeadHistoryEntry]),
    SettingsModule,
    forwardRef(() => SmsModule),
  ],
  controllers: [ShowingFeedbackController],
  providers: [ShowingFeedbackService],
  exports: [ShowingFeedbackService],
})
export class ShowingFeedbackModule {}
