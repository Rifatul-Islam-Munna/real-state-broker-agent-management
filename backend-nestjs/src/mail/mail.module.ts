import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailInboxItem } from './entities/mail.entity';
import { LeadCollectionTemplate } from './entities/lead-collection-template.entity';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailInboxSyncBackgroundService } from './mail-sync.service';
import { LeadCollectionTemplateService } from './lead-collection-template.service';
import { ProviderLeadCollectionTemplateService } from './provider-lead-collection-template.service';
import { LeadTemplateSchemaService } from './lead-template-schema.service';
import { LeadCollectionTemplateController } from './lead-collection-template.controller';
import { LeadsModule } from '../leads/leads.module';
import { AgencyIntegrationSettings } from '../settings/entities/integration-settings.entity';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { Property } from '../properties/entities/property.entity';
import { SettingsModule } from '../settings/settings.module';
import { ShowingFeedbackModule } from '../showing-feedback/showing-feedback.module';
import { PdfsModule } from '../pdfs/pdfs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MailInboxItem,
      LeadCollectionTemplate,
      AgencyIntegrationSettings,
      Lead,
      LeadHistoryEntry,
      Property,
    ]),
    LeadsModule,
    SettingsModule,
    ShowingFeedbackModule,
    PdfsModule,
  ],
  providers: [
    MailService,
    MailInboxSyncBackgroundService,
    LeadTemplateSchemaService,
    {
      provide: LeadCollectionTemplateService,
      useClass: ProviderLeadCollectionTemplateService,
    },
  ],
  controllers: [MailController, LeadCollectionTemplateController],
  exports: [LeadCollectionTemplateService],
})
export class MailModule {}
