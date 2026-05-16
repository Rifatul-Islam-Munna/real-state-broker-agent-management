import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';

/**
 * Lead Qualification Prediction Service
 * Provides AI/ML-based lead scoring (0-100 scale)
 * Consider integrating with external ML service or implementing local scoring logic
 */
@Injectable()
export class LeadQualificationPredictionService {
  constructor(
    @InjectRepository(Lead)
    private leadRepo: Repository<Lead>,
  ) {}

  /**
   * Score a lead's qualification level (0-100)
   * Factors: engagement, response time, property type interest, budget indicators
   */
  async scoreLeadQualification(leadId: number): Promise<{ leadId: number; score: number; factors: object }> {
    const lead = await this.leadRepo.findOne({ where: { id: leadId } });
    if (!lead) {
      return { leadId, score: 0, factors: {} };
    }

    let score = 50; // Base score
    const factors = {
      hasPhone: false,
      hasEmail: false,
      hasNotes: false,
      engagementLevel: 'low',
      responseIndicator: 0,
    };

    // Phone indicator: +15 points
    if (lead.phone) {
      score += 15;
      factors.hasPhone = true;
    }

    // Email indicator: +10 points
    if (lead.email) {
      score += 10;
      factors.hasEmail = true;
    }

    // Notes/engagement indicator: +20 points
    if (lead.notes && lead.notes.length > 20) {
      score += 20;
      factors.hasNotes = true;
      factors.engagementLevel = 'high';
    }

    // Property type interest: +10 points
    if (lead.propertyType) {
      score += 10;
    }

    // Source quality (internal > external): +15 points
    if (lead.source === 'PropertyChat' || lead.source === 'WebsiteForm') {
      score += 15;
      factors.responseIndicator = 1;
    }

    // Priority weighting
    if (lead.priority === 'Hot') {
      score += 15;
    } else if (lead.priority === 'Warm') {
      score += 5;
    }

    // Cap at 100
    score = Math.min(score, 100);

    return {
      leadId,
      score: Math.round(score),
      factors,
    };
  }

  /**
   * Batch score leads
   */
  async scoreLeadsBatch(leadIds: number[]): Promise<Array<{ leadId: number; score: number }>> {
    const results = await Promise.all(
      leadIds.map((id) => this.scoreLeadQualification(id)),
    );
    return results.map((r) => ({ leadId: r.leadId, score: r.score }));
  }

  /**
   * Get high-value leads (score > 70)
   */
  async getHighValueLeads(agencyId?: number): Promise<Lead[]> {
    const leads = await this.leadRepo.find({
      where: agencyId ? { agencyId } : {},
      take: 100,
    });

    const scored = await Promise.all(
      leads.map((lead) => this.scoreLeadQualification(lead.id)),
    );

    const highValue = scored.filter((s) => s.score > 70).map((s) => s.leadId);

    return this.leadRepo.find({ where: { id: highValue as any } });
  }
}
