import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailInboxItem } from './entities/mail.entity';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailInboxSyncBackgroundService } from './mail-sync.service';
import { LeadsModule } from '../leads/leads.module';
import { AgencyIntegrationSettings } from '../settings/entities/integration-settings.entity';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { Property } from '../properties/entities/property.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MailInboxItem, AgencyIntegrationSettings, Lead, LeadHistoryEntry, Property]),
    LeadsModule,
    SettingsModule,
  ],
  providers: [MailService, MailInboxSyncBackgroundService],
  controllers: [MailController],
})
export class MailModule {}
