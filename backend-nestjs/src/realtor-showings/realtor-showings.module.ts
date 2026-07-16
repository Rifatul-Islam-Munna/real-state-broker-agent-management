import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../leads/entities/lead.entity';
import { LeadHistoryEntry } from '../leads/entities/lead-history.entity';
import { LeadsModule } from '../leads/leads.module';
import { Property } from '../properties/entities/property.entity';
import { SettingsModule } from '../settings/settings.module';
import { RealtorsModule } from '../realtors/realtors.module';
import { RealtorShowing } from './entities/realtor-showing.entity';
import { RealtorShowingsController } from './realtor-showings.controller';
import { RealtorShowingsService } from './realtor-showings.service';
import { RealtorShowingsV2Service } from './realtor-showings-v2.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RealtorShowing, Property, Lead, LeadHistoryEntry]),
    LeadsModule,
    SettingsModule,
    RealtorsModule,
  ],
  controllers: [RealtorShowingsController],
  providers: [{ provide: RealtorShowingsService, useClass: RealtorShowingsV2Service }],
})
export class RealtorShowingsModule {}
