import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Property, NeighborhoodInsight, PropertyPreQuestion } from './entities/property.entity';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { PredictionModule } from '../prediction/prediction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Property, NeighborhoodInsight, PropertyPreQuestion]),
    PredictionModule,
  ],
  providers: [PropertiesService],
  controllers: [PropertiesController],
  exports: [PropertiesService],
})
export class PropertiesModule {}
