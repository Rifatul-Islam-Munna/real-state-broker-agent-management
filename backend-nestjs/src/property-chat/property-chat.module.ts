import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PropertyChatConversation, PropertyChatMessage } from './entities/property-chat.entity';
import { PropertyChatService } from './property-chat.service';
import { PropertyChatController } from './property-chat.controller';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { LeadsModule } from '../leads/leads.module';
import { Property } from '../properties/entities/property.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([PropertyChatConversation, PropertyChatMessage, Lead, LeadHistoryEntry, Property]), SettingsModule, LeadsModule],
  providers: [PropertyChatService],
  controllers: [PropertyChatController],
})
export class PropertyChatModule {}
