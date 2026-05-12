import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadHistoryEntry } from './entities/lead-history.entity';
import { LeadsService } from './leads.service';
import { LeadOutreachService } from './lead-outreach.service';
import { LeadsController } from './leads.controller';
import { LeadHistoryController } from './lead-history.controller';
import { LeadOutreachController } from './lead-outreach.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, LeadHistoryEntry])],
  providers: [LeadsService, LeadOutreachService],
  controllers: [LeadsController, LeadHistoryController, LeadOutreachController],
  exports: [LeadsService],
})
export class LeadsModule {}
