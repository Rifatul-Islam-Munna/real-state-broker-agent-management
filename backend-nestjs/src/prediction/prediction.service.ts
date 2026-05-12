import { Injectable } from '@nestjs/common';

@Injectable()
export class PredictionService {
  async predictPropertySales(property: any) {
    return {
      predictedDays: 45,
      confidence: 0.85,
      basis: 'Rule-based estimate',
    };
  }

  async predictLeadQualification(lead: any) {
    return {
      shouldCreateLead: true,
      score: 0.75,
      priority: 'Warm',
      stage: 'Qualified',
    };
  }
}
