import { AiIntelligenceService } from "../common/ai-intelligence.service";
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MailInboxItem } from './entities/mail.entity';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailInboxSyncBackgroundService } from './mail-sync.service';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([MailInboxItem]), LeadsModule],
  providers: [MailService, AiIntelligenceService, MailInboxSyncBackgroundService],
  controllers: [MailController],
})
export class MailModule {}
