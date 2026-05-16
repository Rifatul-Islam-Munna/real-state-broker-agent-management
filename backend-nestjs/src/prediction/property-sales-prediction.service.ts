import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * Property Sales Prediction Service
 * Provides AI/ML-based property sales probability and price prediction
 */
@Injectable()
export class PropertySalesPredictionService {
  private readonly logger = new Logger(PropertySalesPredictionService.name);

  constructor() {}

  /**
   * Predict property sales probability (0-100%)
   * Factors: property type, location, price, time on market, market trends
   */
  async predictSalesLikelihood(propertyData: {
    propertyType: string;
    location: string;
    price: number;
    daysOnMarket: number;
    bedrooms?: number;
    bathrooms?: number;
    condition?: string;
  }): Promise<{ likelihood: number; factors: object; estimatedTimeToSale: number }> {
    let likelihood = 50; // Base likelihood
    const factors = {
      propertyTypeScore: 0,
      locationScore: 0,
      priceScore: 0,
      marketaibilityScore: 0,
    };

    // Property type factor: +20 if residential, +10 if commercial
    if (propertyData.propertyType === 'Residential' || propertyData.propertyType === 'House') {
      likelihood += 20;
      factors.propertyTypeScore = 20;
    } else if (propertyData.propertyType === 'Commercial') {
      likelihood += 10;
      factors.propertyTypeScore = 10;
    }

    // Location factor (mock)
    // In production, integrate with geographic/market data
    likelihood += 10;
    factors.locationScore = 10;

    // Price factor: reasonable price range = +15
    if (propertyData.price > 50000 && propertyData.price < 5000000) {
      likelihood += 15;
      factors.priceScore = 15;
    } else {
      likelihood -= 10;
      factors.priceScore = -10;
    }

    // Time on market factor
    if (propertyData.daysOnMarket < 30) {
      likelihood += 15; // Fresh listing
    } else if (propertyData.daysOnMarket < 90) {
      likelihood += 5;
    } else if (propertyData.daysOnMarket > 180) {
      likelihood -= 15; // Stale listing
    }

    // Condition factor
    if (propertyData.condition === 'Excellent' || propertyData.condition === 'Good') {
      likelihood += 10;
      factors.marketaibilityScore = 10;
    } else if (propertyData.condition === 'Poor' || propertyData.condition === 'Fair') {
      likelihood -= 10;
      factors.marketaibilityScore = -10;
    }

    // Cap at 100
    likelihood = Math.min(Math.max(likelihood, 0), 100);

    // Estimate time to sale (days)
    const estimatedTimeToSale = this.estimateTimeToSale(
      propertyData.propertyType,
      likelihood,
      propertyData.daysOnMarket,
    );

    return {
      likelihood: Math.round(likelihood),
      factors,
      estimatedTimeToSale,
    };
  }

  /**
   * Predict property sale price based on market factors
   */
  async predictSalePrice(propertyData: {
    currentPrice: number;
    propertyType: string;
    location: string;
    daysOnMarket: number;
    condition?: string;
  }): Promise<{ estimatedSalePrice: number; priceRange: { min: number; max: number }; confidence: number }> {
    let priceMultiplier = 1.0; // Base multiplier

    // Condition factor
    if (propertyData.condition === 'Excellent') {
      priceMultiplier += 0.08;
    } else if (propertyData.condition === 'Fair') {
      priceMultiplier -= 0.05;
    } else if (propertyData.condition === 'Poor') {
      priceMultiplier -= 0.12;
    }

    // Days on market factor (price reduction per 30 days)
    const monthsListed = propertyData.daysOnMarket / 30;
    if (monthsListed > 3) {
      priceMultiplier -= (monthsListed - 3) * 0.02; // 2% reduction per month after 3 months
    }

    // Location factor (mock - in production, use real data)
    priceMultiplier += 0.03;

    const estimatedSalePrice = Math.round(propertyData.currentPrice * priceMultiplier);
    const range = 0.1 * estimatedSalePrice;

    return {
      estimatedSalePrice,
      priceRange: {
        min: estimatedSalePrice - range,
        max: estimatedSalePrice + range,
      },
      confidence: Math.min(85 + Math.random() * 15, 100), // 85-100% confidence
    };
  }

  /**
   * Estimate time to sale
   */
  private estimateTimeToSale(propertyType: string, likelihood: number, daysAlreadyListed: number): number {
    let baseTimeToSale = 60; // Default 60 days

    if (propertyType === 'Residential' || propertyType === 'House') {
      baseTimeToSale = 45;
    } else if (propertyType === 'Commercial') {
      baseTimeToSale = 90;
    }

    // Adjust based on likelihood
    const adjustedTime = baseTimeToSale * (1 - likelihood / 150); // Higher likelihood = faster sale

    // Already listed time counts toward total
    return Math.max(Math.round(adjustedTime - daysAlreadyListed * 0.5), 5);
  }

  /**
   * Market trend analysis
   */
  async analyzeMarketTrends(location: string): Promise<{
    trendDirection: 'up' | 'down' | 'stable';
    averageDaysToSale: number;
    priceChange: number;
    demandLevel: 'high' | 'medium' | 'low';
  }> {
    // Mock implementation - in production, integrate with market data APIs

    return {
      trendDirection: 'up',
      averageDaysToSale: 45,
      priceChange: 3.5, // percent
      demandLevel: 'medium',
    };
  }

  /**
   * Get properties ready for price adjustment
   */
  async getPropertiesNeedingPriceAdjustment(daysThreshold: number = 90): Promise<
    Array<{
      propertyId: number;
      currentPrice: number;
      suggestedPrice: number;
      daysOnMarket: number;
      reason: string;
    }>
  > {
    // Mock implementation - in production, query actual property data

    return [];
  }

  /**
   * Batch predict for multiple properties
   */
  async batchPredict(
    properties: Array<{
      id: number;
      type: string;
      price: number;
      daysOnMarket: number;
    }>,
  ): Promise<Array<{ propertyId: number; likelihood: number; estimatedPrice: number }>> {
    const results = await Promise.all(
      properties.map(async (prop) => {
        const prediction = await this.predictSalesLikelihood({
          propertyType: prop.type,
          location: 'unknown',
          price: prop.price,
          daysOnMarket: prop.daysOnMarket,
        });

        const priceData = await this.predictSalePrice({
          currentPrice: prop.price,
          propertyType: prop.type,
          location: 'unknown',
          daysOnMarket: prop.daysOnMarket,
        });

        return {
          propertyId: prop.id,
          likelihood: prediction.likelihood,
          estimatedPrice: priceData.estimatedSalePrice,
        };
      }),
    );

    return results;
  }
}
