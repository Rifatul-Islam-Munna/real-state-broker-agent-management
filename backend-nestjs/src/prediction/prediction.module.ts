import { Module } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { PropertySalesPredictionService } from './property-sales-prediction.service';

@Module({
  providers: [PredictionService, PropertySalesPredictionService],
  exports: [PredictionService, PropertySalesPredictionService],
})
export class PredictionModule {}
