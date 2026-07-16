import { Injectable } from '@nestjs/common';
import { Lead, LeadPriority, LeadStage } from './entities/lead.entity';
import { SettingsService } from '../settings/settings.service';

type LeadDecision = {
  classifier: string;
  confidence: number;
  inBoard: boolean;
  priority: LeadPriority;
  stage: LeadStage;
  text: string;
};

const weakStages = new Set([LeadStage.New, LeadStage.Pending, LeadStage.Contacted, LeadStage.Canceled]);
const strongStages = new Set([LeadStage.Qualified, LeadStage.Visit, LeadStage.Negotiation, LeadStage.Deal]);

@Injectable()
export class LeadIntelligenceService {
  constructor(private readonly settingsService: SettingsService) {}

  async classify(input: any): Promise<LeadDecision> {
    const settings = await this.settingsService.getLeadIntelligence();
    const text = this.normalize([
      input?.name, input?.email, input?.phone, input?.summary, input?.message,
      input?.interest, input?.source, input?.property, input?.timeline, input?.budget,
    ].join(' '));
    const tokens = this.tokens(text);
    const qualified = this.maxSimilarity(tokens, this.vectors(`${settings.qualifiedKnowledge}\n${(settings.learnedQualified ?? []).join('\n')}`)) * 5
      + this.termScore(text, ['buy', 'buyer', 'rent', 'showing', 'viewing', 'tour', 'visit', 'schedule', 'preapproved', 'pre-approved', 'cash', 'offer', 'urgent', 'move', 'asap', 'interested', 'qualified', 'budget']);
    const unqualified = this.maxSimilarity(tokens, this.vectors(`${settings.unqualifiedKnowledge}\n${(settings.learnedUnqualified ?? []).join('\n')}`)) * 5
      + this.termScore(text, ['unsubscribe', 'vendor', 'job', 'career', 'spam', 'marketing', 'partnership', 'not interested', 'wrong number', 'test', 'only question', 'just asking', 'maintenance']);
    const margin = qualified - unqualified;
    const confidence = Math.max(0.35, Math.min(0.95, 0.48 + Math.abs(margin) / 8));
    const strong = margin >= 1.6;
    const weak = margin <= -0.8 || confidence < 0.52;
    return {
      classifier: 'Lead Local Learner',
      confidence,
      inBoard: !weak,
      priority: strong ? LeadPriority.HighPriority : weak ? LeadPriority.FollowUp : LeadPriority.Warm,
      stage: strong ? LeadStage.Qualified : LeadStage.New,
      text: text.slice(0, 1200),
    };
  }

  applyDecision(lead: Lead, decision: LeadDecision, force = false) {
    if (force || !lead.stage || lead.stage === LeadStage.New) lead.stage = decision.stage;
    if (force || !lead.priority || lead.priority === LeadPriority.Warm) lead.priority = decision.priority;
    if (force || lead.inBoard === false) lead.inBoard = decision.inBoard;
    lead.intelligenceClassifier = decision.classifier;
    lead.intelligenceConfidence = Math.round(decision.confidence * 100);
    lead.intelligenceAssignedStage = decision.stage;
    lead.intelligenceAssignedPriority = decision.priority;
    lead.intelligenceAssignedInBoard = decision.inBoard;
    lead.intelligenceText = decision.text;
  }

  async learnFromHumanChange(before: Lead, after: Lead) {
    if (!before.intelligenceClassifier || !before.intelligenceText) return;
    const wasStrong =
      before.intelligenceAssignedInBoard === true ||
      strongStages.has(before.intelligenceAssignedStage as LeadStage) ||
      before.intelligenceAssignedPriority === LeadPriority.HighPriority;
    const wasWeak = !wasStrong;
    const downgraded = after.inBoard === false || weakStages.has(after.stage) || after.priority === LeadPriority.FollowUp;
    const upgraded = strongStages.has(after.stage) || after.priority === LeadPriority.HighPriority;
    if (after.inBoard === false || (downgraded && !upgraded)) {
      await this.settingsService.addLeadLearningExample('unqualified', before.intelligenceText);
      return;
    }
    if (wasWeak && upgraded) {
      await this.settingsService.addLeadLearningExample('qualified', before.intelligenceText);
    }
  }

  private normalize(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9+$@.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private tokens(value: string) {
    return new Set(this.normalize(value).split(/\s+/).filter((item) => item.length > 2));
  }

  private vectors(value: string) {
    return value.split(/\n+/).map((item) => this.tokens(item)).filter((item) => item.size > 0);
  }

  private maxSimilarity(tokens: Set<string>, examples: Set<string>[]) {
    let best = 0;
    for (const example of examples) {
      let shared = 0;
      for (const token of tokens) if (example.has(token)) shared++;
      best = Math.max(best, shared / Math.sqrt(Math.max(1, tokens.size * example.size)));
    }
    return best;
  }

  private termScore(text: string, terms: string[]) {
    return terms.filter((term) => text.includes(term)).length;
  }
}
