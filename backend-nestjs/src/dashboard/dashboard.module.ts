import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { Lead } from '../leads/entities/lead.entity';
import { DealPipeline } from '../deals/entities/deal-pipeline.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { ContactRequest } from '../contact/entities/contact.entity';
import { MailInboxItem } from '../mail/entities/mail.entity';
import { ShowingBooking } from '../brokerage/entities/brokerage.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, Lead, DealPipeline, ContactRequest, MailInboxItem, ShowingBooking])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
