import { Injectable } from '@nestjs/common';

@Injectable()
export class AiIntelligenceService {
  async analyzeEmail(content: string) {
    return { summary: 'AI analyzed summary', qualified: true };
  }
}
