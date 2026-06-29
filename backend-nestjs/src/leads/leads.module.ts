import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { LeadsService } from './leads.service';
import { LeadOutreachService } from './lead-outreach.service';
import { LeadsController } from './leads.controller';
import { LeadHistoryController } from './lead-history.controller';
import { LeadOutreachController } from './lead-outreach.controller';
import { LeadQualificationPredictionService } from './lead-qualification-prediction.service';
import { MailboxLeadIntelligenceService } from './mailbox-lead-intelligence.service';
import { LeadOutreachBackgroundService } from './lead-outreach-background.service';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { SettingsModule } from '../settings/settings.module';
import { MailInboxItem } from '../mail/entities/mail.entity';
import { ContactRequest } from '../contact/entities/contact.entity';
import { BrokerageModule } from '../brokerage/brokerage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, LeadHistoryEntry, DealPipeline, MailInboxItem, ContactRequest]), SettingsModule, BrokerageModule],
  providers: [
    LeadsService,
    LeadOutreachService,
    LeadQualificationPredictionService,
    MailboxLeadIntelligenceService,
    LeadOutreachBackgroundService,
  ],
  controllers: [LeadsController, LeadHistoryController, LeadOutreachController],
  exports: [
    LeadsService,
    LeadQualificationPredictionService,
    MailboxLeadIntelligenceService,
    LeadOutreachBackgroundService,
  ],
})
export class LeadsModule {}
