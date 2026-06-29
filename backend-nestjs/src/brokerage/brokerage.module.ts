import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowingBooking, LeadAssignmentRule, BrokerageApprovalRequest } from './entities/brokerage.entity';
import { BrokerageAuditLog } from './entities/audit-log.entity';
import { BrokerageService } from './brokerage.service';
import { BrokerageController } from './brokerage.controller';
import { BrokerageCompatController } from './brokerage-compat.controller';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { ContactRequest } from '../contact/entities/contact.entity';
import { PropertyChatConversation } from '../property-chat/entities/property-chat.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShowingBooking,
      LeadAssignmentRule,
      BrokerageApprovalRequest,
      BrokerageAuditLog,
      Lead,
      Property,
      User,
      ContactRequest,
      PropertyChatConversation,
      LeadHistoryEntry,
      DealPipeline,
    ]),
  ],
  providers: [BrokerageService],
  controllers: [BrokerageController, BrokerageCompatController],
  exports: [BrokerageService],
})
export class BrokerageModule {}
