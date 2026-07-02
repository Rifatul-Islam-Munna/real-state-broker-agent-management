import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property, NeighborhoodInsight, PropertyPreQuestion } from './entities/property.entity';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PredictionModule } from '../prediction/prediction.module';
import { BrokerageModule } from '../brokerage/brokerage.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, NeighborhoodInsight, PropertyPreQuestion]),
    PredictionModule,
    BrokerageModule,
    SettingsModule,
  ],
  providers: [PropertiesService],
  controllers: [PropertiesController],
  exports: [PropertiesService],
})
export class PropertiesModule {}
