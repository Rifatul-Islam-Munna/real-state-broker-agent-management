import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShowingBooking, LeadAssignmentRule, BrokerageApprovalRequest } from './entities/brokerage.entity';
import { BrokerageAuditLog } from './entities/audit-log.entity';
import { BrokerageService } from './brokerage.service';
import { BrokerageController } from './brokerage.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ShowingBooking, LeadAssignmentRule, BrokerageApprovalRequest, BrokerageAuditLog])],
  providers: [BrokerageService],
  controllers: [BrokerageController],
  exports: [BrokerageService],
})
export class BrokerageModule {}
