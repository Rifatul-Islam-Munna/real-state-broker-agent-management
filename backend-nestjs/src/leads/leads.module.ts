import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadOutreachBackgroundService } from './lead-outreach.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lead])],
  providers: [LeadsService, LeadOutreachBackgroundService],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
