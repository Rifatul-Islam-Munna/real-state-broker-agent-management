import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DealPipeline, DealChecklistItem } from './entities/deal-pipeline.entity';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [TypeOrmModule.forFeature([DealPipeline, DealChecklistItem]), LeadsModule],
  providers: [DealsService],
  controllers: [DealsController],
  exports: [DealsService],
})
export class DealsModule {}
