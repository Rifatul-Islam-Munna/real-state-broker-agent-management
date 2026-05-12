import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { Lead } from '../leads/entities/lead.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, Lead, DealPipeline])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
