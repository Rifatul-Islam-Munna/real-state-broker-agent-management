import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowingBooking, LeadAssignmentRule, BrokerageApprovalRequest } from './entities/brokerage.entity';
import { BrokerageAuditLog, WebsiteInquiry } from './entities/audit-log.entity';
import { BrokerageService } from './brokerage.service';
import { BrokerageController } from './brokerage.controller';
import { Lead } from '../leads/entities/lead.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ShowingBooking,
      LeadAssignmentRule,
      BrokerageApprovalRequest,
      BrokerageAuditLog,
      WebsiteInquiry,
      Lead,
      Property,
      User,
    ]),
  ],
  providers: [BrokerageService],
  controllers: [BrokerageController],
  exports: [BrokerageService],
})
export class BrokerageModule {}
