import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingSettings } from './entities/marketing.entity';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingSettings])],
  providers: [MarketingService],
  controllers: [MarketingController],
})
export class MarketingModule {}
